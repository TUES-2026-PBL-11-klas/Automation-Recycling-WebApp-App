import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthController } from './health.controller';

// MetricsService comes from the global MetricsModule.
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
