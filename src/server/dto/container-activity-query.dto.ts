import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ContainerLogsQueryDto {
  @ApiPropertyOptional({ default: 200, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  tail = 200;

  @ApiPropertyOptional({ default: 60, minimum: 1, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  sinceMinutes = 60;
}

export class ContainerAuditQueryDto {
  @ApiPropertyOptional({ default: 1440, minimum: 1, maximum: 10080 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10080)
  sinceMinutes = 1440;
}
