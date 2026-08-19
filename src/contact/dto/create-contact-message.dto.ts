import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

export class CreateContactMessageDto {
  @ApiProperty({ example: 'María López', minLength: 2, maxLength: 120 })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'maria@empresa.com', maxLength: 255 })
  @Trim()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Automatización de procesos', maxLength: 160 })
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @ApiProperty({ minLength: 10, maxLength: 5000 })
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
