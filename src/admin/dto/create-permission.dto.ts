import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'users.read' })
  @Trim()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/)
  key!: string;

  @ApiPropertyOptional()
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}
