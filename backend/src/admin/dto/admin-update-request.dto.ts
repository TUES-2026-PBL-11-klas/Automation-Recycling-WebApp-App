import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class AdminUpdateRequestDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  scheduledTimeFrom?: string;

  @IsOptional()
  @IsString()
  scheduledTimeTo?: string;
}

export class AdminScheduleRouteDto {
  @IsUUID()
  districtId: string;

  @IsDateString()
  routeDate: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
