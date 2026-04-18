import { Controller, Get, UseGuards } from '@nestjs/common';
import { ElectronicsService } from './electronics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('electronics')
export class ElectronicsController {
  constructor(private electronicsService: ElectronicsService) {}

  @Get()
  findAll() {
    return this.electronicsService.findAll();
  }
}
