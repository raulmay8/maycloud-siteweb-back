import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ListDirectoriesQueryDto {
  @ApiPropertyOptional({
    default: '/',
    example: '/products/control-horas',
    description: 'Ruta relativa a la raíz operativa configurada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^\/(?!.*(?:^|\/)\.\.(?:\/|$))[^\0]*$/)
  path = '/';
}
