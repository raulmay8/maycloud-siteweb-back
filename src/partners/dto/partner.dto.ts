import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { PartnerStatus } from '../../generated/prisma/client';
import { Trim } from '../../common/validation/trim.decorator';

// =========================================================
// CREATE PARTNER
// =========================================================

export class CreatePartnerDto {
  @ApiProperty({
    example: 'Carlos Hernández',
    description: 'Nombre completo del socio',
  })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'carlos@example.com',
    description: 'Correo electrónico único del socio',
  })
  @Trim()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({
    example: '+529981234567',
    description: 'Número telefónico del socio',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: 'México',
    description: 'País de residencia',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;
}

// =========================================================
// UPDATE PARTNER
// =========================================================

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {}

// =========================================================
// UPDATE PARTNER STATUS
// =========================================================

export class UpdatePartnerStatusDto {
  @ApiProperty({
    enum: PartnerStatus,
    example: PartnerStatus.ACTIVE,
    description: 'Nuevo estado del socio',
  })
  @IsEnum(PartnerStatus)
  status!: PartnerStatus;
}

// =========================================================
// LIST PARTNERS QUERY
// =========================================================

export class ListPartnersQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({
    description: 'Buscar por nombre, correo, teléfono o país',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    enum: PartnerStatus,
    description: 'Filtrar por estado del socio',
  })
  @IsOptional()
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;
}
