import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from './metrics.service';

// Global so any module can record to the same registry the /metrics endpoint
// exposes, without a web of imports.
@Global()
@Module({
  imports: [PrismaModule],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
