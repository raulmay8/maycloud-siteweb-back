import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/auth/public.decorator';
import { ApiMessages } from '../common/messages/api.messages';
import { ApiErrorResponse } from '../common/responses/api-response.model';
import { ResponseMessage } from '../common/responses/response-message.decorator';
import {
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_SESSION_DURATION_MS,
  ANALYTICS_VISITOR_COOKIE,
  ANALYTICS_VISITOR_DURATION_MS,
} from './analytics.constants';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { CreateAnalyticsSessionDto } from './dto/create-analytics-session.dto';

@ApiTags('Analítica')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('session')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ResponseMessage(ApiMessages.analytics.sessionReady)
  @ApiCreatedResponse({ description: 'Sesión de analítica preparada' })
  async startSession(
    @Body() dto: CreateAnalyticsSessionDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const identity = await this.analyticsService.startSession(
      dto,
      this.getCookie(request, ANALYTICS_SESSION_COOKIE),
      this.getCookie(request, ANALYTICS_VISITOR_COOKIE),
    );
    const secure = this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie(ANALYTICS_SESSION_COOKIE, identity.sessionToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: ANALYTICS_SESSION_DURATION_MS,
    });
    response.cookie(ANALYTICS_VISITOR_COOKIE, identity.visitorToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: ANALYTICS_VISITOR_DURATION_MS,
    });

    return { isNewSession: identity.isNewSession };
  }

  @Public()
  @Post('events/contact-form-interaction')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ResponseMessage(ApiMessages.analytics.interactionRecorded)
  @ApiCreatedResponse({ description: 'Interacción registrada' })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  recordContactFormInteraction(
    @Body() dto: CreateAnalyticsEventDto,
    @Req() request: Request,
  ) {
    return this.analyticsService.recordContactFormInteraction(
      this.getCookie(request, ANALYTICS_SESSION_COOKIE),
      dto,
    );
  }

  private getCookie(request: Request, name: string): string | undefined {
    const value = request.cookies?.[name] as unknown;
    return typeof value === 'string' ? value : undefined;
  }
}
