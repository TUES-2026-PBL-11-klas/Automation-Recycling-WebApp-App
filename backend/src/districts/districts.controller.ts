import { Controller, Get, UseGuards } from '@nestjs/common';
import { DistrictsService } from './districts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('districts')
export class DistrictsController {
  constructor(private districtsService: DistrictsService) {}

  @Get()
  findAll() {
    return this.districtsService.findAll();
  }
}
