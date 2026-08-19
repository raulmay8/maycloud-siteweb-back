import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiMessages } from '../messages/api.messages';

interface HttpErrorBody {
  error?: string;
  message?: string | string[];
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId = request.header('x-request-id') || randomUUID();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : ApiMessages.internalError;
    const parsed = this.parseBody(body, status);
    response.setHeader('x-request-id', requestId);
    response.status(status).json({
      success: false,
      message: parsed.message,
      error: { code: parsed.code, details: parsed.details },
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      requestId,
    });
  }

  private parseBody(body: string | object, status: number) {
    if (typeof body === 'string') {
      return { message: body, code: HttpStatus[status] ?? 'ERROR' };
    }
    const error = body as HttpErrorBody;
    const details = Array.isArray(error.message) ? error.message : undefined;
    return {
      message: details?.length
        ? ApiMessages.validationFailed
        : error.message || ApiMessages.internalError,
      code: error.error?.toUpperCase().replaceAll(' ', '_') ?? 'ERROR',
      details,
    };
  }
}
