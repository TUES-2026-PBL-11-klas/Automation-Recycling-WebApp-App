import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PickupRequestsService } from './pickup-requests.service';
import { CreatePickupRequestDto } from './dto/create-pickup-request.dto';

type AuthRequest = { user: { userId: string } };

@UseGuards(JwtAuthGuard)
@Controller('pickup-requests')
export class PickupRequestsController {
  constructor(private service: PickupRequestsService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreatePickupRequestDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Get('my')
  findMy(@Req() req: AuthRequest) {
    return this.service.findByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.findOne(id, req.user.userId);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.cancel(id, req.user.userId);
  }
}
