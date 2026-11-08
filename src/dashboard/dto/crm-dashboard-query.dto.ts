import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export enum CrmDashboardScope {
  ALL = 'all',
  MINE = 'mine',
}

export class CrmDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Primer día incluido en formato YYYY-MM-DD',
    example: '2026-11-01',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({
    description: 'Último día incluido en formato YYYY-MM-DD',
    example: '2026-11-30',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional({
    enum: CrmDashboardScope,
    default: CrmDashboardScope.ALL,
    description:
      'Permite consultar todos los prospectos o solamente los asignados al usuario autenticado',
  })
  @IsOptional()
  @IsEnum(CrmDashboardScope)
  scope: CrmDashboardScope = CrmDashboardScope.ALL;
}
