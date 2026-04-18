import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ElectronicsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.electronicsItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }
}
