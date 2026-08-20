import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

export class CreateAnalyticsEventDto {
  @ApiProperty({ example: '/', maxLength: 500 })
  @Trim()
  @IsString()
  @MaxLength(500)
  @Matches(/^\/(?!\/)/, {
    message: 'pagePath debe ser una ruta relativa que comience con /',
  })
  pagePath!: string;
}
