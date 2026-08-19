import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z][a-z0-9_-]*$/)
  name!: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
