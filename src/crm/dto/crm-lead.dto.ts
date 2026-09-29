import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CrmActivityType,
  CrmLinkType,
  CrmOfferingPriority,
} from '../../generated/prisma/client';
import { Trim } from '../../common/validation/trim.decorator';

export class CrmLeadLinkDto {
  @ApiProperty({ enum: CrmLinkType })
  @IsEnum(CrmLinkType)
  type!: CrmLinkType;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiProperty({ example: 'https://example.com' })
  @Trim()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url!: string;
}

export class CrmLeadDigitalAssetDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  digitalAssetId!: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}

export class CrmLeadServiceOfferingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  serviceOfferingId!: string;

  @ApiPropertyOptional({ enum: CrmOfferingPriority })
  @IsOptional()
  @IsEnum(CrmOfferingPriority)
  priority?: CrmOfferingPriority;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateCrmLeadDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  company!: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  position?: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ description: 'Ciudad o localidad en texto libre' })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  statusId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  businessTypeId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  assignedToId?: string | null;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [CrmLeadDigitalAssetDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CrmLeadDigitalAssetDto)
  digitalAssets?: CrmLeadDigitalAssetDto[];

  @ApiPropertyOptional({ type: [CrmLeadServiceOfferingDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CrmLeadServiceOfferingDto)
  serviceOfferings?: CrmLeadServiceOfferingDto[];

  @ApiPropertyOptional({ type: [CrmLeadLinkDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CrmLeadLinkDto)
  links?: CrmLeadLinkDto[];
}

export class UpdateCrmLeadDto extends PartialType(CreateCrmLeadDto) {}

export class ListCrmLeadsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsUUID('4')
  statusId?: string;

  @IsOptional()
  @IsUUID('4')
  assignedToId?: string;
}

export class CreateCrmNoteDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}

export class CreateCrmActivityDto {
  @IsEnum(CrmActivityType)
  type!: CrmActivityType;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

export class CrmEmailDto {
  @ApiPropertyOptional({ enum: ['es', 'en'], default: 'es' })
  @IsOptional()
  @IsIn(['es', 'en'])
  locale: 'es' | 'en' = 'es';

  @Trim()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  recipient?: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  content!: string;
}
