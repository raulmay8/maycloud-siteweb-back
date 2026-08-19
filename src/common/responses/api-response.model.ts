import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessResponse<T> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Operación realizada correctamente' })
  message!: string;

  data!: T;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;

  @ApiProperty({ example: '/api/contact' })
  path!: string;

  @ApiProperty({ format: 'uuid' })
  requestId!: string;
}

export class ApiErrorDetail {
  @ApiProperty({ example: 'BAD_REQUEST' })
  code!: string;

  @ApiProperty({ required: false, isArray: true })
  details?: unknown[];
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 'Los datos enviados no son válidos' })
  message!: string;

  error!: ApiErrorDetail;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;

  @ApiProperty({ example: '/api/contact' })
  path!: string;

  @ApiProperty({ format: 'uuid' })
  requestId!: string;
}
