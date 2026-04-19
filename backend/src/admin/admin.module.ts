import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PickupRequestsModule } from '../pickup-requests/pickup-requests.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [PrismaModule, PickupRequestsModule, SchedulerModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
