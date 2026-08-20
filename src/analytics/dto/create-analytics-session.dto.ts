import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

export class CreateAnalyticsSessionDto {
  @ApiProperty({ example: '/', maxLength: 500 })
  @Trim()
  @IsString()
  @MaxLength(500)
  @Matches(/^\/(?!\/)/, {
    message: 'landingPath debe ser una ruta relativa que comience con /',
  })
  landingPath!: string;

  @ApiPropertyOptional({ example: 'google.com', maxLength: 255 })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  referrerHost?: string;
}
