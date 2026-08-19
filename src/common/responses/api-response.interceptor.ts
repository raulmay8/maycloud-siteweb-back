import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Observable, map } from 'rxjs';
import { ApiMessages } from '../messages/api.messages';
import { ApiSuccessResponse } from './api-response.model';
import { RESPONSE_MESSAGE_KEY } from './response-message.decorator';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor<
  unknown,
  ApiSuccessResponse<unknown>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const requestId = request.header('x-request-id') || randomUUID();
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      ApiMessages.success;
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      map((data: unknown) => ({
        success: true as const,
        message,
        data,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        requestId,
      })),
    );
  }
}
