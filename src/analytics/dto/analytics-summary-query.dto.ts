import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AnalyticsSummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Primer día incluido en formato YYYY-MM-DD (UTC)',
    example: '2026-08-01',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({
    description: 'Último día incluido en formato YYYY-MM-DD (UTC)',
    example: '2026-08-19',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  @IsDateString({ strict: true })
  to?: string;
}
