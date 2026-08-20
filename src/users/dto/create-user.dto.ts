import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
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

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@maycloud.com' })
  @Trim()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 12, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'La contraseña requiere una minúscula' })
  @Matches(/[A-Z]/, { message: 'La contraseña requiere una mayúscula' })
  @Matches(/\d/, { message: 'La contraseña requiere un número' })
  password!: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

class UpdateUserFieldsDto {
  @ApiPropertyOptional({ example: 'usuario@maycloud.com' })
  @Trim()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  lastName!: string;
}

export class UpdateUserDto extends PartialType(UpdateUserFieldsDto) {}
