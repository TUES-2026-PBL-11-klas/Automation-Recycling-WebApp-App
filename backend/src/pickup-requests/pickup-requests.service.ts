import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePickupRequestDto } from './dto/create-pickup-request.dto';
import { SchedulerService } from '../scheduler/scheduler.service';

const REQUEST_INCLUDE = {
  address: { include: { district: true } },
  items: { include: { electronicsItem: true } },
  availabilitySlots: true,
  availabilityPreferences: true,
} as const;

@Injectable()
export class PickupRequestsService {
  constructor(
    private prisma: PrismaService,
    private scheduler: SchedulerService,
  ) {}

  async create(userId: string, dto: CreatePickupRequestDto, adminId?: string) {
    const district = await this.prisma.district.findFirst({
      where: { id: dto.districtId, isActive: true },
      select: { id: true },
    });
    if (!district) {
      throw new BadRequestException('Unknown or inactive district');
    }

    const requestedIds = [
      ...new Set(dto.items.map((i) => i.electronicsItemId)),
    ];
    const electronicsItems = await this.prisma.electronicsItem.findMany({
      where: { id: { in: requestedIds }, isActive: true },
    });
    const itemMap = new Map(electronicsItems.map((e) => [e.id, e]));

    // Without this an unknown id reaches the database and fails a foreign key
    // constraint as a 500, and a deactivated item is accepted silently at zero
    // volume — which would quietly distort every packing decision.
    const unknown = requestedIds.filter((id) => !itemMap.has(id));
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown or inactive electronics items: ${unknown.join(', ')}`,
      );
    }

    let totalWeight = 0;
    let totalVolume = 0;
    const items = dto.items.map((item) => {
      const e = itemMap.get(item.electronicsItemId)!;
      const weight = e.defaultWeight * item.quantity;
      const volume = e.defaultVolume * item.quantity;
      totalWeight += weight;
      totalVolume += volume;
      return {
        electronicsItemId: item.electronicsItemId,
        quantity: item.quantity,
        estimatedWeight: weight,
        estimatedVolume: volume,
        notes: item.notes,
      };
    });

    // One transaction, so a failure creating the request cannot leave an
    // orphaned address behind.
    return this.prisma.$transaction(async (tx) => {
      // Reuse an identical address rather than inserting a duplicate for every
      // booking from the same place.
      const addressWhere = {
        userId,
        districtId: dto.districtId,
        city: dto.city,
        street: dto.street,
        buildingNumber: dto.buildingNumber,
        entrance: dto.entrance ?? null,
        floor: dto.floor ?? null,
        apartment: dto.apartment ?? null,
      };

      const address =
        (await tx.address.findFirst({ where: addressWhere })) ??
        (await tx.address.create({
          data: { ...addressWhere, additionalNotes: dto.additionalNotes },
        }));

      return tx.pickupRequest.create({
        data: {
          userId,
          addressId: address.id,
          ...(adminId && { createdByAdminId: adminId }),
          estimatedTotalWeight: totalWeight,
          estimatedTotalVolume: totalVolume,
          preferredNote: dto.preferredNote,
          items: { create: items },
          ...(dto.availabilitySlots?.length && {
            availabilitySlots: {
              create: dto.availabilitySlots.map((s) => ({
                availableDate: new Date(s.availableDate),
                timeFrom: s.timeFrom,
                timeTo: s.timeTo,
                isFlexible: s.isFlexible ?? false,
              })),
            },
          }),
          ...(dto.availabilityPreferences?.length && {
            availabilityPreferences: { create: dto.availabilityPreferences },
          }),
        },
        include: REQUEST_INCLUDE,
      });
    });
  }

  findByUser(userId: string) {
    return this.prisma.pickupRequest.findMany({
      where: { userId },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const req = await this.prisma.pickupRequest.findFirst({
      where: { id, userId },
      include: REQUEST_INCLUDE,
    });
    if (!req) throw new NotFoundException('Request not found');
    return req;
  }

  async cancel(id: string, userId: string) {
    const req = await this.prisma.pickupRequest.findFirst({
      where: { id, userId },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (['COMPLETED', 'IN_TRANSIT'].includes(req.status)) {
      throw new BadRequestException(
        'Cannot cancel a request that is already in transit or completed',
      );
    }

    // If the request is already on a route, cancelling the status alone leaves
    // the stop behind, so the route keeps counting its volume and the driver
    // still sees the address. The scheduler knows how to detach it cleanly and
    // promote a reserve where one exists.
    if (req.routeId) {
      await this.scheduler.handleCancellation(req.routeId, id);
      return this.prisma.pickupRequest.findFirstOrThrow({
        where: { id },
        include: REQUEST_INCLUDE,
      });
    }

    return this.prisma.pickupRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: REQUEST_INCLUDE,
    });
  }
}
