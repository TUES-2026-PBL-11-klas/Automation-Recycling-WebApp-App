import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const TRUCK_VOLUME = 7;          // m³ total truck capacity
const TARGET_RATIO = 0.80;       // aim for 80% fill
const RESERVE_RATIO = 0.20;      // 20% reserved in case of cancellations
const UNDERLOAD_MIN = 0.75;      // below this after 7 days = underload
const MIN_AFTER_CANCEL = 0.60;   // warn if capacity drops below 60% after cancellation
const SMALL_ITEM_FREE = 5;       // first N small items don't add volume
const WAIT_DAYS = 7;

// Depot: София 1870 кв. Кремиковци, Индустриална зона
const DEPOT_LNG = 23.4714;
const DEPOT_LAT = 42.7284;

const SCHEDULE_INCLUDE = {
  items: { include: { electronicsItem: true } },
  address: { include: { district: true } },
  user: { select: { id: true, name: true, email: true } },
  availabilitySlots: true,
} as const;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService, private mail: MailService) {}

  // Small items (isSmallItem=true) only add volume once there are more than SMALL_ITEM_FREE of them
  private calcEffectiveVolume(requests: any[]): number {
    let smallCount = 0;
    let largeVol = 0;
    let smallVol = 0;

    for (const r of requests) {
      for (const item of r.items) {
        if (item.electronicsItem.isSmallItem) {
          smallCount += item.quantity;
          smallVol += item.estimatedVolume ?? 0;
        } else {
          largeVol += item.estimatedVolume ?? 0;
        }
      }
    }

    return largeVol + (smallCount > SMALL_ITEM_FREE ? smallVol : 0);
  }

  private marginalVolume(existing: any[], candidate: any): number {
    return (
      this.calcEffectiveVolume([...existing, candidate]) -
      this.calcEffectiveVolume(existing)
    );
  }

  private getAddressString(req: any): string {
    const a = req.address;
    return `${a.street} ${a.buildingNumber}, ${a.district.name}, ${a.city}`;
  }

  private async geocodeAddress(text: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = new URL('https://api.openrouteservice.org/geocode/search');
      url.searchParams.set('api_key', process.env.OPENROUTESERVICE_API_KEY ?? '');
      url.searchParams.set('text', text);
      url.searchParams.set('boundary.country', 'BG');
      url.searchParams.set('size', '1');

      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = await res.json() as any;
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (!coords) return null;
      return { lat: coords[1] as number, lng: coords[0] as number };
    } catch {
      return null;
    }
  }

  // Returns request IDs in optimized pickup order using OpenRouteService
  private async optimizeStops(stops: Array<{ id: string; lat: number; lng: number }>): Promise<string[]> {
    if (stops.length === 0) return [];
    if (stops.length === 1) return [stops[0].id];

    try {
      const body = {
        vehicles: [{ id: 1, profile: 'driving-car', start: [DEPOT_LNG, DEPOT_LAT], end: [DEPOT_LNG, DEPOT_LAT] }],
        jobs: stops.map((s, i) => ({ id: i + 1, location: [s.lng, s.lat], service: 300 })),
      };

      const res = await fetch('https://api.openrouteservice.org/optimization', {
        method: 'POST',
        headers: {
          Authorization: process.env.OPENROUTESERVICE_API_KEY ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`ORS ${res.status}`);
      const data = await res.json() as any;
      const ordered: number[] = data.routes[0].steps
        .filter((s: any) => s.type === 'job')
        .map((s: any) => (s.job as number) - 1);

      return ordered.map(i => stops[i].id);
    } catch (e) {
      this.logger.error('ORS optimization failed — falling back to closest-first', e);
      return stops
        .map(s => ({ ...s, dist: (s.lat - DEPOT_LAT) ** 2 + (s.lng - DEPOT_LNG) ** 2 }))
        .sort((a, b) => a.dist - b.dist)
        .map(s => s.id);
    }
  }

  // Build a list of requests that fits within a volume cap, preserving order
  private packRequests(pool: any[], volumeCap: number, existing: any[] = []): any[] {
    const packed: any[] = [...existing];
    for (const req of pool) {
      if (packed.find(r => r.id === req.id)) continue;
      const marginal = this.marginalVolume(packed, req);
      if (this.calcEffectiveVolume(packed) + marginal <= volumeCap) {
        packed.push(req);
      }
    }
    return packed.slice(existing.length);
  }

  // Returns true if request has no slots (always available) or has a slot for the given date
  private isAvailableOn(req: any, date: Date): boolean {
    if (!req.availabilitySlots?.length) return true;
    const target = date.toISOString().slice(0, 10);
    return req.availabilitySlots.some(
      (s: any) => new Date(s.availableDate).toISOString().slice(0, 10) === target,
    );
  }

  // Returns the time window for a request on a specific date, or null if flexible/unset
  private getTimeWindow(req: any, date: Date): { from: string; to: string } | null {
    if (!req.availabilitySlots?.length) return null;
    const target = date.toISOString().slice(0, 10);
    const slot = req.availabilitySlots.find(
      (s: any) => new Date(s.availableDate).toISOString().slice(0, 10) === target,
    );
    if (!slot || slot.isFlexible) return null;
    return { from: slot.timeFrom, to: slot.timeTo };
  }

  // Finds the date in the next 14 days that has the most requests available
  private findBestRouteDate(requests: any[]): Date {
    const hasAnySlots = requests.some((r) => r.availabilitySlots?.length > 0);
    const fallback = new Date();
    fallback.setHours(12, 0, 0, 0);
    fallback.setDate(fallback.getDate() + WAIT_DAYS);
    if (!hasAnySlots) return fallback;

    let bestDate = fallback;
    let bestCount = -1;
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() + i);
      const count = requests.filter((r) => this.isAvailableOn(r, d)).length;
      if (count > bestCount) { bestCount = count; bestDate = d; }
    }
    return bestDate;
  }

  async runForDistrict(districtId: string) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - WAIT_DAYS * 24 * 60 * 60 * 1000);

    const confirmed = await this.prisma.pickupRequest.findMany({
      where: { address: { districtId }, status: 'CONFIRMED', routeId: null },
      include: SCHEDULE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    // IDs already locked into a quota-reached package (emailed routes, main stops only)
    const lockedIds = new Set<string>(
      (await this.prisma.routeStop.findMany({
        where: { route: { emailSentAt: { not: null } }, isReserve: false },
        select: { requestId: true },
      })).map(s => s.requestId),
    );

    const existingRoute = await this.prisma.route.findFirst({
      where: { districtId, status: 'PLANNED', emailSentAt: null },
      include: { stops: { include: { request: { include: SCHEDULE_INCLUDE } } } },
      orderBy: { createdAt: 'asc' },
    });

    const targetVol = TRUCK_VOLUME * TARGET_RATIO;
    const reserveVol = TRUCK_VOLUME * RESERVE_RATIO;
    const underloadVol = TRUCK_VOLUME * UNDERLOAD_MIN;

    // ── No existing route: try to start one ───────────────────────────────────
    if (!existingRoute) {
      // Pick the date that maximises available requests, then filter to only those available
      const bestDate = this.findBestRouteDate(confirmed);
      const available = confirmed.filter((r) => this.isAvailableOn(r, bestDate));

      const totalVol = this.calcEffectiveVolume(available);
      if (totalVol < underloadVol) {
        return { status: 'WAITING', message: 'Not enough volume yet', currentVol: totalVol };
      }

      const main = this.packRequests(available, targetVol);
      const usedIds = new Set(main.map((r: any) => r.id));

      // Reserve: same district first, then neighbors
      let reserve = this.packRequests(
        available.filter((r: any) => !usedIds.has(r.id)),
        reserveVol,
      );

      if (this.calcEffectiveVolume(reserve) < reserveVol * 0.5) {
        const neighborIds = await this.getNeighborIds(districtId);
        const neighborPool = await this.prisma.pickupRequest.findMany({
          where: {
            address: { districtId: { in: neighborIds } },
            status: 'CONFIRMED',
            routeId: null,
            id: { notIn: [...lockedIds] },
          },
          include: SCHEDULE_INCLUDE,
          orderBy: { createdAt: 'asc' },
        });
        reserve = this.packRequests(
          neighborPool.filter((r: any) => !usedIds.has(r.id) && this.isAvailableOn(r, bestDate)),
          reserveVol,
        );
      }

      const route = await this.createRoute(districtId, main, reserve, bestDate);
      return { status: 'ROUTE_CREATED', routeId: route.id, mainCount: main.length, reserveCount: reserve.length };
    }

    // ── Existing PLANNED route ─────────────────────────────────────────────────
    const routeAgeDays = (now.getTime() - existingRoute.createdAt.getTime()) / 86400000;
    const mainStops = existingRoute.stops.filter(s => !s.isReserve);
    const reserveStops = existingRoute.stops.filter(s => s.isReserve);
    const mainRequests = mainStops.map(s => s.request);
    const currentVol = this.calcEffectiveVolume(mainRequests);

    // OVERLOAD: at/above threshold OR we already have a reserve (main list is full)
    if (currentVol >= underloadVol || reserveStops.length > 0) {
      return this.finalizeAndSendEmails(existingRoute.id, mainRequests, existingRoute.routeDate);
    }

    // UNDERLOAD: less than 75% after 7+ days — try neighbors
    if (routeAgeDays >= WAIT_DAYS) {
      const neighborIds = await this.getNeighborIds(districtId);
      const neighborPool = await this.prisma.pickupRequest.findMany({
        where: {
          address: { districtId: { in: neighborIds } },
          status: 'CONFIRMED',
          routeId: null,
          createdAt: { gte: oneWeekAgo },
          id: { notIn: [...lockedIds] },
        },
        include: SCHEDULE_INCLUDE,
        orderBy: { createdAt: 'asc' },
      });

      const usedIds = new Set(mainRequests.map((r: any) => r.id));
      const added = this.packRequests(
        neighborPool.filter((r: any) => !usedIds.has(r.id)),
        targetVol - currentVol,
        mainRequests,
      );

      if (added.length > 0) {
        await this.prisma.routeStop.createMany({
          data: added.map((r: any, i: number) => ({
            routeId: existingRoute.id,
            requestId: r.id,
            stopOrder: mainStops.length + i + 1,
            isReserve: false,
          })),
        });
        await this.prisma.pickupRequest.updateMany({
          where: { id: { in: added.map((r: any) => r.id) } },
          data: { routeId: existingRoute.id },
        });
      }

      const augmented = [...mainRequests, ...added];
      const newVol = this.calcEffectiveVolume(augmented);

      // Send after two weeks regardless
      if (newVol >= underloadVol || routeAgeDays >= WAIT_DAYS * 2) {
        return this.finalizeAndSendEmails(existingRoute.id, augmented, existingRoute.routeDate);
      }

      return { status: 'WAITING_EXTENDED', message: 'Waiting 1 more week', currentVol: newVol };
    }

    return { status: 'IN_PROGRESS', currentVol, routeAgeDays };
  }

  // ── Post-email cancellation handling ─────────────────────────────────────────
  async handleCancellation(routeId: string, requestId: string) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: { stops: { include: { request: { include: SCHEDULE_INCLUDE } } } },
    });
    if (!route) throw new NotFoundException('Route not found');

    const cancelledStop = route.stops.find(s => s.requestId === requestId);
    if (!cancelledStop) throw new NotFoundException('Request not in this route');

    const mainStops = route.stops.filter(s => !s.isReserve && s.requestId !== requestId);
    const reserveStops = route.stops.filter(s => s.isReserve);
    const mainRequests = mainStops.map(s => s.request);

    // Before emails sent: just remove from route cleanly
    if (!route.emailSentAt) {
      await this.prisma.routeStop.delete({ where: { id: cancelledStop.id } });
      await this.prisma.pickupRequest.update({
        where: { id: requestId },
        data: { routeId: null, status: 'CANCELLED' },
      });
      return { status: 'REMOVED_PRE_EMAIL' };
    }

    // After emails sent: try to promote a reserve
    if (reserveStops.length > 0) {
      const promoted = reserveStops[0];
      const promotedReq = promoted.request;

      await this.prisma.routeStop.update({
        where: { id: promoted.id },
        data: { isReserve: false, stopOrder: cancelledStop.stopOrder },
      });
      const promotedTw = this.getTimeWindow(promotedReq, route.routeDate);
      await this.prisma.pickupRequest.update({
        where: { id: promotedReq.id },
        data: {
          status: 'IN_TRANSIT',
          scheduledDate: route.routeDate,
          scheduledTimeFrom: promotedTw?.from ?? null,
          scheduledTimeTo: promotedTw?.to ?? null,
        },
      });
      await this.prisma.routeStop.update({
        where: { id: cancelledStop.id },
        data: { status: 'SKIPPED' },
      });
      await this.prisma.pickupRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });

      await this.mail.sendReserveActivated(promotedReq.user.email, {
        name: promotedReq.user.name,
        requestId: promotedReq.id,
        address: this.getAddressString(promotedReq),
        scheduledDate: route.routeDate,
        timeFrom: promotedReq.scheduledTimeFrom,
        timeTo: promotedReq.scheduledTimeTo,
      });

      const remainingVol = this.calcEffectiveVolume([...mainRequests, promotedReq]);
      const ratio = remainingVol / (TRUCK_VOLUME * TARGET_RATIO);
      return {
        status: 'RESERVE_PROMOTED',
        promotedRequestId: promotedReq.id,
        capacityRatio: ratio,
        warning: ratio < MIN_AFTER_CANCEL ? 'Capacity dropped below 60%' : null,
      };
    }

    // No reserve — leave a hole, just skip the stop
    await this.prisma.routeStop.update({
      where: { id: cancelledStop.id },
      data: { status: 'SKIPPED' },
    });
    await this.prisma.pickupRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    const ratio = this.calcEffectiveVolume(mainRequests) / (TRUCK_VOLUME * TARGET_RATIO);
    return {
      status: 'HOLE_IN_ROUTE',
      capacityRatio: ratio,
      warning: ratio < MIN_AFTER_CANCEL ? 'Capacity dropped below 60%' : null,
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────────

  private async getNeighborIds(districtId: string): Promise<string[]> {
    const rows = await this.prisma.districtNeighbor.findMany({
      where: { districtId },
      select: { neighborDistrictId: true },
    });
    return rows.map(r => r.neighborDistrictId);
  }

  private async createRoute(districtId: string, main: any[], reserve: any[], routeDate: Date) {
    const allIds = [...main.map((r: any) => r.id), ...reserve.map((r: any) => r.id)];
    const route = await this.prisma.route.create({
      data: {
        districtId,
        routeDate,
        totalEstimatedWeight: main.reduce((s: number, r: any) => s + (r.estimatedTotalWeight ?? 0), 0),
        totalEstimatedVolume: this.calcEffectiveVolume(main),
        stops: {
          create: [
            ...main.map((r: any, i: number) => ({ requestId: r.id, stopOrder: i + 1, isReserve: false })),
            ...reserve.map((r: any, i: number) => ({ requestId: r.id, stopOrder: main.length + i + 1, isReserve: true })),
          ],
        },
      },
    });
    await this.prisma.pickupRequest.updateMany({
      where: { id: { in: allIds } },
      data: { routeId: route.id },
    });
    return route;
  }

  private async finalizeAndSendEmails(routeId: string, mainRequests: any[], scheduledDate: Date) {
    // Geocode any addresses missing coordinates
    const stopsWithCoords: Array<{ id: string; lat: number; lng: number }> = [];
    for (const req of mainRequests) {
      let lat = req.address.latitude as number | null;
      let lng = req.address.longitude as number | null;

      if (!lat || !lng) {
        const geo = await this.geocodeAddress(this.getAddressString(req));
        if (geo) {
          lat = geo.lat; lng = geo.lng;
          await this.prisma.address.update({ where: { id: req.address.id }, data: { latitude: lat, longitude: lng } });
        }
      }
      if (lat && lng) stopsWithCoords.push({ id: req.id, lat, lng });
    }

    // Optimize stop order
    const orderedIds = await this.optimizeStops(stopsWithCoords);
    for (let i = 0; i < orderedIds.length; i++) {
      await this.prisma.routeStop.updateMany({
        where: { routeId, requestId: orderedIds[i], isReserve: false },
        data: { stopOrder: i + 1 },
      });
    }

    // Mark requests IN_TRANSIT with their individual time windows
    for (const req of mainRequests) {
      const tw = this.getTimeWindow(req, scheduledDate);
      await this.prisma.pickupRequest.update({
        where: { id: req.id },
        data: {
          status: 'IN_TRANSIT',
          scheduledDate,
          scheduledTimeFrom: tw?.from ?? null,
          scheduledTimeTo: tw?.to ?? null,
        },
      });
    }
    await this.prisma.route.update({
      where: { id: routeId },
      data: { emailSentAt: new Date() },
    });

    // Send confirmation emails to main list only
    for (const req of mainRequests) {
      await this.mail.sendPickupConfirmation(req.user.email, {
        name: req.user.name,
        requestId: req.id,
        address: this.getAddressString(req),
        scheduledDate,
        timeFrom: req.scheduledTimeFrom,
        timeTo: req.scheduledTimeTo,
      });
    }

    return { status: 'EMAILS_SENT', count: mainRequests.length, routeId };
  }
}
