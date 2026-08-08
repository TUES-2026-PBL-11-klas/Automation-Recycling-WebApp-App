import { Module } from '@nestjs/common';
import { PickupRequestsService } from './pickup-requests.service';
import { PickupRequestsController } from './pickup-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [PrismaModule, SchedulerModule],
  controllers: [PickupRequestsController],
  providers: [PickupRequestsService],
  exports: [PickupRequestsService],
})
export class PickupRequestsModule {}
