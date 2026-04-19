import { Module } from '@nestjs/common';
import { PickupRequestsService } from './pickup-requests.service';
import { PickupRequestsController } from './pickup-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PickupRequestsController],
  providers: [PickupRequestsService],
  exports: [PickupRequestsService],
})
export class PickupRequestsModule {}
