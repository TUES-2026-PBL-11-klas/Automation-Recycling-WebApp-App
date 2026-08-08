import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PreferenceType } from '@prisma/client';

export class CreateRequestItemDto {
  @IsUUID()
  electronicsItemId: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  @MaxLength(1000)
  additionalNotes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  items: CreateRequestItemDto[];

  @IsOptional()
  @IsArray()
  // One slot per day over the 14-day booking window the UI offers
  @ArrayMaxSize(14)
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
  @MaxLength(1000)
  preferredNote?: string;
}

export class AdminCreatePickupRequestDto extends CreatePickupRequestDto {
  @IsUUID()
  userId: string;
}
