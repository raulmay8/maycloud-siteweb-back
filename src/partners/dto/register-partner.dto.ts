import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';

import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator';

// =========================================================
// PARTNER DATA
// =========================================================

export class PublicPartnerDto {
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
    description: 'Correo electrónico del socio',
  })
  @Trim()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({
    example: '+529981234567',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: 'México',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;
}

// =========================================================
// REFERRED CLIENT DATA
// =========================================================

export class PublicReferredClientDto {
  @ApiProperty({
    example: 'Comercializadora del Caribe',
    description: 'Nombre de la empresa recomendada',
  })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  company!: string;

  @ApiPropertyOptional({
    example: 'Andrea López',
    description: 'Nombre del contacto de la empresa',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @ApiPropertyOptional({
    example: 'andrea@example.com',
  })
  @Trim()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: '+529981112233',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: 'La empresa necesita un sistema de inventarios.',
    description: 'Descripción del proyecto recomendado',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}

// =========================================================
// PUBLIC REGISTRATION
// =========================================================

export class RegisterPartnerDto {
  @ApiProperty({
    type: PublicPartnerDto,
  })
  @ValidateNested()
  @Type(() => PublicPartnerDto)
  partner!: PublicPartnerDto;

  @ApiProperty({
    type: PublicReferredClientDto,
  })
  @ValidateNested()
  @Type(() => PublicReferredClientDto)
  client!: PublicReferredClientDto;

  @ApiPropertyOptional({
    description: 'Token generado por Cloudflare Turnstile',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  turnstileToken?: string;

  @ApiPropertyOptional({
    description: 'Campo honeypot; debe permanecer vacío',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;
}
