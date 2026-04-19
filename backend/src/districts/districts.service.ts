import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DistrictsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.district.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
