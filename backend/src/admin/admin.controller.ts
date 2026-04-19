import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequestStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { AdminUpdateRequestDto, AdminScheduleRouteDto } from './dto/admin-update-request.dto';
import { AdminCreatePickupRequestDto } from '../pickup-requests/dto/create-pickup-request.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private schedulerService: SchedulerService,
  ) {}

  @Get('requests')
  findAllRequests(
    @Query('status') status?: RequestStatus,
    @Query('districtId') districtId?: string,
  ) {
    return this.adminService.findAllRequests({ status, districtId });
  }

  @Post('requests')
  createForUser(@Req() req: any, @Body() dto: AdminCreatePickupRequestDto) {
    return this.adminService.createForUser(req.user.userId, dto);
  }

  @Patch('requests/:id')
  updateRequest(@Param('id') id: string, @Body() dto: AdminUpdateRequestDto) {
    return this.adminService.updateRequest(id, dto);
  }

  @Delete('requests/:id')
  deleteRequest(@Param('id') id: string) {
    return this.adminService.deleteRequest(id);
  }

  @Get('users')
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('districts')
  findAllDistricts() {
    return this.adminService.findAllDistricts();
  }

  @Post('routes/schedule')
  scheduleRoute(@Body() dto: AdminScheduleRouteDto) {
    return this.adminService.scheduleRoute(dto);
  }

  // Run the full scheduling algorithm for a specific district
  @Post('scheduler/run/:districtId')
  runScheduler(@Param('districtId') districtId: string) {
    return this.schedulerService.runForDistrict(districtId);
  }

  // Handle a last-moment cancellation on a route that already had emails sent
  @Post('routes/:routeId/cancel-stop/:requestId')
  handleCancellation(
    @Param('routeId') routeId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.schedulerService.handleCancellation(routeId, requestId);
  }
}
