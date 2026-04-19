import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PickupRequestsService } from './pickup-requests.service';
import { CreatePickupRequestDto } from './dto/create-pickup-request.dto';

@UseGuards(JwtAuthGuard)
@Controller('pickup-requests')
export class PickupRequestsController {
  constructor(private service: PickupRequestsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreatePickupRequestDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Get('my')
  findMy(@Req() req: any) {
    return this.service.findByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(id, req.user.userId);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.service.cancel(id, req.user.userId);
  }
}
