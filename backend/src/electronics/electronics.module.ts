import { Module } from '@nestjs/common';
import { ElectronicsService } from './electronics.service';
import { ElectronicsController } from './electronics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ElectronicsController],
  providers: [ElectronicsService],
  exports: [ElectronicsService],
})
export class ElectronicsModule {}
