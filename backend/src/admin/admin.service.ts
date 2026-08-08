import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PickupRequestsService } from '../pickup-requests/pickup-requests.service';
import {
  AdminUpdateRequestDto,
  AdminScheduleRouteDto,
} from './dto/admin-update-request.dto';
import { AdminCreatePickupRequestDto } from '../pickup-requests/dto/create-pickup-request.dto';

const ADMIN_REQUEST_INCLUDE = {
  user: { select: { id: true, name: true, email: true, phoneNumber: true } },
  address: { include: { district: true } },
  items: { include: { electronicsItem: true } },
  availabilitySlots: true,
  availabilityPreferences: true,
} as const;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private pickupRequestsService: PickupRequestsService,
  ) {}

  findAllRequests(filters: { status?: RequestStatus; districtId?: string }) {
    return this.prisma.pickupRequest.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.districtId && {
          address: { districtId: filters.districtId },
        }),
      },
      include: ADMIN_REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRequest(id: string, dto: AdminUpdateRequestDto) {
    const exists = await this.prisma.pickupRequest.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Request not found');
    return this.prisma.pickupRequest.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.scheduledDate && {
          scheduledDate: new Date(dto.scheduledDate),
        }),
        ...(dto.scheduledTimeFrom !== undefined && {
          scheduledTimeFrom: dto.scheduledTimeFrom,
        }),
        ...(dto.scheduledTimeTo !== undefined && {
          scheduledTimeTo: dto.scheduledTimeTo,
        }),
      },
      include: ADMIN_REQUEST_INCLUDE,
    });
  }

  async deleteRequest(id: string) {
    const exists = await this.prisma.pickupRequest.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Request not found');
    await this.prisma.pickupRequest.delete({ where: { id } });
    return { message: 'Request deleted' };
  }

  createForUser(adminId: string, dto: AdminCreatePickupRequestDto) {
    return this.pickupRequestsService.create(dto.userId, dto, adminId);
  }

  findAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async scheduleRoute(dto: AdminScheduleRouteDto) {
    const { districtId, routeDate, vehicleId, teamId } = dto;
    const date = new Date(routeDate);

    const requests = await this.prisma.pickupRequest.findMany({
      where: { address: { districtId }, status: 'CONFIRMED' },
    });

    if (requests.length === 0) {
      // Try combining with neighboring district
      const neighbors = await this.prisma.districtNeighbor.findMany({
        where: { districtId },
        include: { neighborDistrict: true },
      });
      const neighborIds = neighbors.map((n) => n.neighborDistrictId);

      const neighborRequests = await this.prisma.pickupRequest.findMany({
        where: {
          address: { districtId: { in: neighborIds } },
          status: 'CONFIRMED',
        },
      });

      if (neighborRequests.length === 0) {
        throw new BadRequestException(
          'No confirmed requests found in this district or its neighbors',
        );
      }
      requests.push(...neighborRequests);
    }

    const route = await this.prisma.route.create({
      data: {
        districtId,
        routeDate: date,
        ...(vehicleId && { vehicleId }),
        ...(teamId && { teamId }),
        totalEstimatedWeight: requests.reduce(
          (s, r) => s + (r.estimatedTotalWeight ?? 0),
          0,
        ),
        totalEstimatedVolume: requests.reduce(
          (s, r) => s + (r.estimatedTotalVolume ?? 0),
          0,
        ),
        stops: {
          create: requests.map((r, i) => ({
            requestId: r.id,
            stopOrder: i + 1,
          })),
        },
      },
      include: {
        stops: {
          include: {
            request: { include: { address: { include: { district: true } } } },
          },
        },
        district: true,
      },
    });

    await this.prisma.pickupRequest.updateMany({
      where: { id: { in: requests.map((r) => r.id) } },
      data: { routeId: route.id, status: 'IN_TRANSIT', scheduledDate: date },
    });

    // Schedule 24h notifications
    await this.prisma.notification.createMany({
      data: requests.map((r) => ({
        userId: r.userId,
        requestId: r.id,
        type: 'EMAIL' as const,
        message: `Вашата заявка ще бъде обработена на ${date.toLocaleDateString('bg-BG')}. Очаквайте нашия екип.`,
        scheduledFor: new Date(date.getTime() - 24 * 60 * 60 * 1000),
      })),
    });

    return route;
  }

  findAllDistricts() {
    return this.prisma.district.findMany({ orderBy: { name: 'asc' } });
  }
}
