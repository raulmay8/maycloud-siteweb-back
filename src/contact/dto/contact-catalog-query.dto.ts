import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator';

export class ContactCatalogQueryDto {
  @ApiPropertyOptional({
    example: 'es',
    maxLength: 10,
    description:
      'Código del idioma solicitado. Si se omite, se utilizará el idioma predeterminado.',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[a-z]{2,3}(?:-[a-z]{2,3})?$/i, {
    message: 'El locale no tiene un formato válido',
  })
  locale?: string;
}
