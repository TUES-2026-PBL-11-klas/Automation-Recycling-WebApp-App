import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PreferenceType } from '@prisma/client';

export class CreateRequestItemDto {
  @IsUUID()
  electronicsItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAvailabilitySlotDto {
  @IsDateString()
  availableDate: string;

  @IsString()
  timeFrom: string;

  @IsString()
  timeTo: string;

  @IsOptional()
  @IsBoolean()
  isFlexible?: boolean;
}

export class CreateAvailabilityPreferenceDto {
  @IsEnum(PreferenceType)
  preferenceType: PreferenceType;

  @IsOptional()
  @IsString()
  value?: string;
}

export class CreatePickupRequestDto {
  @IsUUID()
  districtId: string;

  @IsString()
  city: string;

  @IsString()
  street: string;

  @IsString()
  buildingNumber: string;

  @IsOptional()
  @IsString()
  entrance?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  items: CreateRequestItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilitySlotDto)
  availabilitySlots?: CreateAvailabilitySlotDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityPreferenceDto)
  availabilityPreferences?: CreateAvailabilityPreferenceDto[];

  @IsOptional()
  @IsString()
  preferredNote?: string;
}

export class AdminCreatePickupRequestDto extends CreatePickupRequestDto {
  @IsUUID()
  userId: string;
}
