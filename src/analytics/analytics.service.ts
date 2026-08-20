import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApiMessages } from '../common/messages/api.messages';
import { PrismaService } from '../database/prisma.service';
import { AnalyticsEventType } from '../generated/prisma/client';
import { ANALYTICS_SESSION_DURATION_MS } from './analytics.constants';
import type { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import type { CreateAnalyticsSessionDto } from './dto/create-analytics-session.dto';

interface AnalyticsSessionIdentity {
  sessionToken: string;
  visitorToken: string;
  isNewSession: boolean;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(
    dto: CreateAnalyticsSessionDto,
    sessionToken?: string,
    visitorToken?: string,
  ): Promise<AnalyticsSessionIdentity> {
    const now = new Date();
    const activeSince = new Date(now.getTime() - ANALYTICS_SESSION_DURATION_MS);
    const currentVisitorToken = this.isUuid(visitorToken)
      ? visitorToken
      : randomUUID();

    if (this.isUuid(sessionToken)) {
      const existing = await this.prisma.analyticsSession.findFirst({
        where: { sessionToken, lastActivityAt: { gte: activeSince } },
        select: { id: true, visitorToken: true },
      });

      if (existing) {
        const effectiveVisitorToken =
          existing.visitorToken ?? currentVisitorToken;
        await this.prisma.analyticsSession.update({
          where: { id: existing.id },
          data: {
            lastActivityAt: now,
            visitorToken: effectiveVisitorToken,
          },
        });
        return {
          sessionToken,
          visitorToken: effectiveVisitorToken,
          isNewSession: false,
        };
      }
    }

    const newSessionToken = randomUUID();
    await this.prisma.analyticsSession.create({
      data: {
        sessionToken: newSessionToken,
        visitorToken: currentVisitorToken,
        landingPath: dto.landingPath,
        referrerHost: dto.referrerHost || null,
        startedAt: now,
        lastActivityAt: now,
      },
    });

    return {
      sessionToken: newSessionToken,
      visitorToken: currentVisitorToken,
      isNewSession: true,
    };
  }

  async recordContactFormInteraction(
    sessionToken: string | undefined,
    dto: CreateAnalyticsEventDto,
  ) {
    if (!this.isUuid(sessionToken)) {
      throw new BadRequestException(ApiMessages.analytics.invalidSession);
    }

    const now = new Date();
    const activeSince = new Date(now.getTime() - ANALYTICS_SESSION_DURATION_MS);
    const session = await this.prisma.analyticsSession.findFirst({
      where: { sessionToken, lastActivityAt: { gte: activeSince } },
      select: { id: true },
    });

    if (!session) {
      throw new BadRequestException(ApiMessages.analytics.invalidSession);
    }

    await this.prisma.$transaction([
      this.prisma.analyticsEvent.upsert({
        where: {
          sessionId_type: {
            sessionId: session.id,
            type: AnalyticsEventType.CONTACT_FORM_INTERACTION,
          },
        },
        create: {
          eventToken: randomUUID(),
          sessionId: session.id,
          type: AnalyticsEventType.CONTACT_FORM_INTERACTION,
          pagePath: dto.pagePath,
          occurredAt: now,
        },
        update: {},
      }),
      this.prisma.analyticsSession.update({
        where: { id: session.id },
        data: { lastActivityAt: now },
      }),
    ]);

    return { recorded: true };
  }

  private isUuid(value?: string): value is string {
    return (
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    );
  }
}
