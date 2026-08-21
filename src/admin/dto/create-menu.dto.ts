import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

export class CreateMenuDto {
  @ApiProperty({ example: 'users' })
  @Trim()
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]*$/)
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: 'Usuarios' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string;

  @ApiPropertyOptional({ example: '/admin/users' })
  @Trim()
  @IsOptional()
  @IsString()
  @Matches(/^\//)
  @MaxLength(255)
  route?: string;

  @ApiPropertyOptional({ example: 'users' })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  icon?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Envía null para colocar el menú en la raíz',
  })
  @IsOptional()
  @IsUUID('4')
  parentId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Envía null para mostrarlo sin requerir un permiso',
  })
  @IsOptional()
  @IsUUID('4')
  permissionId?: string | null;
}

export class UpdateMenuDto extends PartialType(CreateMenuDto) {}
