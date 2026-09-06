import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator';

export class CreateContactMessageDto {
  @ApiProperty({
    example: 'María López',
    minLength: 2,
    maxLength: 120,
  })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'MayCloud',
    maxLength: 160,
    description: 'Nombre de la empresa o proyecto del cliente',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyOrProject?: string;

  @ApiProperty({
    example: 'maria@empresa.com',
    maxLength: 255,
  })
  @Trim()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({
    example: '+52 998 123 4567',
    maxLength: 30,
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[0-9+\-().\s]+$/, {
    message: 'El teléfono contiene caracteres no permitidos',
  })
  phone?: string;

  @ApiProperty({
    format: 'uuid',
    description: 'ID de la etapa actual del proyecto',
  })
  @IsUUID()
  projectStageId!: string;

  @ApiProperty({
    type: [String],
    description: 'IDs de las opciones de desarrollo seleccionadas',
    minItems: 1,
    example: [
      '45f2701d-10b6-4f55-b248-c7c4f9f3f135',
      '5b2fd4dd-e6ba-40d5-bd82-6d86f81d1ff8',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  developmentOptionIds!: string[];

  @ApiProperty({
    example:
      'Necesitamos desarrollar una aplicación para administrar nuestras operaciones.',
    minLength: 10,
    maxLength: 5000,
  })
  @Trim()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Token generado por Cloudflare Turnstile',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
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
