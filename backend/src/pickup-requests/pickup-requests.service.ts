import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePickupRequestDto } from './dto/create-pickup-request.dto';

const REQUEST_INCLUDE = {
  address: { include: { district: true } },
  items: { include: { electronicsItem: true } },
  availabilitySlots: true,
  availabilityPreferences: true,
} as const;

@Injectable()
export class PickupRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePickupRequestDto, adminId?: string) {
    const electronicsItems = await this.prisma.electronicsItem.findMany({
      where: { id: { in: dto.items.map((i) => i.electronicsItemId) } },
    });
    const itemMap = new Map(electronicsItems.map((e) => [e.id, e]));

    let totalWeight = 0;
    let totalVolume = 0;
    const items = dto.items.map((item) => {
      const e = itemMap.get(item.electronicsItemId);
      const weight = (e?.defaultWeight ?? 0) * item.quantity;
      const volume = (e?.defaultVolume ?? 0) * item.quantity;
      totalWeight += weight;
      totalVolume += volume;
      return { electronicsItemId: item.electronicsItemId, quantity: item.quantity, estimatedWeight: weight, estimatedVolume: volume, notes: item.notes };
    });

    const address = await this.prisma.address.create({
      data: {
        userId,
        districtId: dto.districtId,
        city: dto.city,
        street: dto.street,
        buildingNumber: dto.buildingNumber,
        entrance: dto.entrance,
        floor: dto.floor,
        apartment: dto.apartment,
        additionalNotes: dto.additionalNotes,
      },
    });

    return this.prisma.pickupRequest.create({
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
  }

  findByUser(userId: string) {
    return this.prisma.pickupRequest.findMany({
      where: { userId },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const req = await this.prisma.pickupRequest.findFirst({ where: { id, userId }, include: REQUEST_INCLUDE });
    if (!req) throw new NotFoundException('Request not found');
    return req;
  }

  async cancel(id: string, userId: string) {
    const req = await this.prisma.pickupRequest.findFirst({ where: { id, userId } });
    if (!req) throw new NotFoundException('Request not found');
    if (['COMPLETED', 'IN_TRANSIT'].includes(req.status)) {
      throw new BadRequestException('Cannot cancel a request that is already in transit or completed');
    }
    return this.prisma.pickupRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: REQUEST_INCLUDE,
    });
  }
}
