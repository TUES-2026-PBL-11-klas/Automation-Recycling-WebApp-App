import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthController } from './health.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [MetricsService],
})
export class HealthModule {}
