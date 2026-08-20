import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApiMessages } from '../common/messages/api.messages';
import { PrismaService } from '../database/prisma.service';
import { AnalyticsEventType } from '../generated/prisma/client';
import { ANALYTICS_SESSION_DURATION_MS } from './analytics.constants';
import type { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import type { CreateAnalyticsSessionDto } from './dto/create-analytics-session.dto';
import type { AnalyticsSummaryQueryDto } from './dto/analytics-summary-query.dto';

interface AnalyticsSessionIdentity {
  sessionToken: string;
  visitorToken: string;
  isNewSession: boolean;
}

export interface AnalyticsDailyRow {
  date: string;
  visits: number;
  interactions: number;
}

export interface AnalyticsSummary {
  period: { from: string; to: string; timezone: 'UTC' };
  totals: {
    visits: number;
    contactFormInteractions: number;
    interactionRate: number;
  };
  series: AnalyticsDailyRow[];
}

const DAY_MS = 86_400_000;
const MAX_SUMMARY_DAYS = 366;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: AnalyticsSummaryQueryDto): Promise<AnalyticsSummary> {
    const period = this.resolvePeriod(query);
    const series = await this.prisma.$queryRawUnsafe<AnalyticsDailyRow[]>(
      `
        SELECT
          to_char(days.day, 'YYYY-MM-DD') AS "date",
          COALESCE(s.visits, 0)::int AS "visits",
          COALESCE(e.interactions, 0)::int AS "interactions"
        FROM generate_series(
          $1::timestamptz,
          $2::timestamptz - interval '1 day',
          interval '1 day'
        ) AS days(day)
        LEFT JOIN (
          SELECT
            (started_at AT TIME ZONE 'UTC')::date AS day,
            COUNT(*)::int AS visits
          FROM analytics_sessions
          WHERE started_at >= $1::timestamptz
            AND started_at < $2::timestamptz
          GROUP BY day
        ) AS s ON s.day = days.day::date
        LEFT JOIN (
          SELECT
            (occurred_at AT TIME ZONE 'UTC')::date AS day,
            COUNT(*)::int AS interactions
          FROM analytics_events
          WHERE type = 'CONTACT_FORM_INTERACTION'
            AND occurred_at >= $1::timestamptz
            AND occurred_at < $2::timestamptz
          GROUP BY day
        ) AS e ON e.day = days.day::date
        ORDER BY days.day ASC
      `,
      period.fromDate,
      period.toExclusive,
    );
    const visits = series.reduce((total, day) => total + day.visits, 0);
    const contactFormInteractions = series.reduce(
      (total, day) => total + day.interactions,
      0,
    );

    return {
      period: { from: period.from, to: period.to, timezone: 'UTC' },
      totals: {
        visits,
        contactFormInteractions,
        interactionRate:
          visits === 0
            ? 0
            : Number(((contactFormInteractions / visits) * 100).toFixed(2)),
      },
      series,
    };
  }

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

  private resolvePeriod(query: AnalyticsSummaryQueryDto) {
    const today = this.dateOnly(new Date());
    const to = query.to ?? today;
    const toDate = new Date(`${to}T00:00:00.000Z`);
    const defaultFromDate = new Date(toDate.getTime() - 29 * DAY_MS);
    const from = query.from ?? this.dateOnly(defaultFromDate);
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const days =
      Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;

    if (days < 1) {
      throw new BadRequestException(
        'La fecha inicial debe ser anterior o igual a la fecha final.',
      );
    }
    if (days > MAX_SUMMARY_DAYS) {
      throw new BadRequestException(
        `El rango no puede superar ${MAX_SUMMARY_DAYS} días.`,
      );
    }

    return {
      from,
      to,
      fromDate,
      toExclusive: new Date(toDate.getTime() + DAY_MS),
    };
  }

  private dateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
