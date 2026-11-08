import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CRM_DASHBOARD_DEFAULT_PERIOD_DAYS,
  CRM_DASHBOARD_MAX_PERIOD_DAYS,
  CRM_DASHBOARD_ATTENTION_LIMIT,
  CRM_DASHBOARD_RECENT_ACTIVITY_LIMIT,
  CRM_DASHBOARD_TIMEZONE,
  CRM_DASHBOARD_UTC_OFFSET,
  CRM_CONTACT_ACTIVITY_TYPES,
  CRM_FOLLOW_UP_THRESHOLDS_DAYS,
} from './dashboard.constants';
import {
  CrmAttentionPriority,
  CrmAttentionReason,
  type CrmDashboardAttentionLead,
  type CrmDashboardDailyTrend,
  CrmDashboardPeriod,
  type CrmDashboardRecentActivity,
  CrmDashboardResponse,
  CrmDashboardSummary,
} from './dashboard.types';
import {
  CrmDashboardQueryDto,
  CrmDashboardScope,
} from './dto/crm-dashboard-query.dto';

const DAY_MS = 86_400_000;

interface ResolvedDashboardPeriod {
  period: CrmDashboardPeriod;
  fromDate: Date;
  toExclusive: Date;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCrmDashboard(
    query: CrmDashboardQueryDto,
    userId: string,
  ): Promise<CrmDashboardResponse> {
    const resolvedPeriod = this.resolvePeriod(query);
    const scopeWhere =
      query.scope === CrmDashboardScope.MINE ? { assignedToId: userId } : {};
    const activeWhere = {
      ...scopeWhere,
      status: { isFinal: false },
    };
    const periodWhere = {
      gte: resolvedPeriod.fromDate,
      lt: resolvedPeriod.toExclusive,
    };

    const [
      totalActiveLeads,
      newLeads,
      pendingContact,
      contacted,
      converted,
      unassigned,
      withoutActivity,
      statuses,
    ] = await this.prisma.$transaction([
      this.prisma.crmLead.count({ where: activeWhere }),
      this.prisma.crmLead.count({
        where: { ...scopeWhere, createdAt: periodWhere },
      }),
      this.prisma.crmLead.count({
        where: { ...scopeWhere, status: { code: 'PENDING_CONTACT' } },
      }),
      this.prisma.crmLead.count({
        where: { ...scopeWhere, status: { code: 'CONTACTED' } },
      }),
      this.prisma.crmLead.count({
        where: {
          ...scopeWhere,
          status: { code: 'CONVERTED' },
          updatedAt: periodWhere,
        },
      }),
      this.prisma.crmLead.count({
        where: { AND: [activeWhere, { assignedToId: null }] },
      }),
      this.prisma.crmLead.count({
        where: {
          ...activeWhere,
          activities: {
            none: { type: { in: CRM_CONTACT_ACTIVITY_TYPES } },
          },
        },
      }),
      this.prisma.crmLeadStatus.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: {
            select: { leads: { where: scopeWhere } },
          },
        },
      }),
    ]);

    const [attentionRequired, recentActivity, dailyTrend] = await Promise.all([
      this.getAttentionRequired(activeWhere, new Date()),
      this.getRecentActivity(query.scope, userId),
      this.getDailyTrend(resolvedPeriod, query.scope, userId),
    ]);

    const pipelineTotal = statuses.reduce(
      (total, status) => total + status._count.leads,
      0,
    );
    const summary: CrmDashboardSummary = {
      totalActiveLeads,
      newLeads,
      pendingContact,
      contacted,
      converted,
      unassigned,
      withoutActivity,
      conversionRate:
        newLeads === 0 ? 0 : Number(((converted / newLeads) * 100).toFixed(2)),
    };

    return {
      period: resolvedPeriod.period,
      summary,
      pipeline: statuses.map(({ _count, ...status }) => ({
        statusId: status.id,
        code: status.code,
        name: status.name,
        color: status.color,
        sortOrder: status.sortOrder,
        isFinal: status.isFinal,
        leadCount: _count.leads,
        percentage:
          pipelineTotal === 0
            ? 0
            : Number(((_count.leads / pipelineTotal) * 100).toFixed(2)),
      })),
      attentionRequired,
      recentActivity,
      dailyTrend,
    };
  }

  private async getRecentActivity(
    scope: CrmDashboardScope,
    userId: string,
  ): Promise<CrmDashboardRecentActivity[]> {
    const activities = await this.prisma.crmLeadActivity.findMany({
      where:
        scope === CrmDashboardScope.MINE
          ? { lead: { assignedToId: userId } }
          : {},
      orderBy: { occurredAt: 'desc' },
      take: CRM_DASHBOARD_RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        type: true,
        description: true,
        occurredAt: true,
        lead: {
          select: { id: true, company: true, contactName: true },
        },
        performedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return activities.map((activity) => ({
      ...activity,
      occurredAt: activity.occurredAt.toISOString(),
    }));
  }

  private async getDailyTrend(
    period: ResolvedDashboardPeriod,
    scope: CrmDashboardScope,
    userId: string,
  ): Promise<CrmDashboardDailyTrend[]> {
    const scopeWhere =
      scope === CrmDashboardScope.MINE ? { assignedToId: userId } : {};
    const activityScopeWhere =
      scope === CrmDashboardScope.MINE
        ? { lead: { assignedToId: userId } }
        : {};
    const dateWhere = {
      gte: period.fromDate,
      lt: period.toExclusive,
    };
    const [createdLeads, convertedLeads, activities] = await Promise.all([
      this.prisma.crmLead.findMany({
        where: { ...scopeWhere, createdAt: dateWhere },
        select: { createdAt: true },
      }),
      this.prisma.crmLead.findMany({
        where: {
          ...scopeWhere,
          status: { code: 'CONVERTED' },
          updatedAt: dateWhere,
        },
        select: { updatedAt: true },
      }),
      this.prisma.crmLeadActivity.findMany({
        where: { ...activityScopeWhere, occurredAt: dateWhere },
        select: { occurredAt: true },
      }),
    ]);
    const daily = new Map<string, CrmDashboardDailyTrend>();

    for (
      let date = this.parseDateOnly(period.period.from);
      date < this.parseDateOnly(period.period.to);
      date = new Date(date.getTime() + DAY_MS)
    ) {
      const day = this.formatDateOnly(date);
      daily.set(day, { date: day, created: 0, converted: 0, activities: 0 });
    }
    const finalDay = period.period.to;
    daily.set(finalDay, {
      date: finalDay,
      created: 0,
      converted: 0,
      activities: 0,
    });

    for (const lead of createdLeads) {
      const day = this.formatDateInDashboardTimezone(lead.createdAt);
      const value = daily.get(day);
      if (value) value.created += 1;
    }
    for (const lead of convertedLeads) {
      const day = this.formatDateInDashboardTimezone(lead.updatedAt);
      const value = daily.get(day);
      if (value) value.converted += 1;
    }
    for (const activity of activities) {
      const day = this.formatDateInDashboardTimezone(activity.occurredAt);
      const value = daily.get(day);
      if (value) value.activities += 1;
    }

    return [...daily.values()];
  }

  private async getAttentionRequired(
    activeWhere: Record<string, unknown>,
    referenceDate: Date,
  ): Promise<CrmDashboardAttentionLead[]> {
    const leads = await this.prisma.crmLead.findMany({
      where: activeWhere,
      select: {
        id: true,
        company: true,
        contactName: true,
        createdAt: true,
        status: {
          select: { id: true, code: true, name: true, color: true },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        activities: {
          where: { type: { in: CRM_CONTACT_ACTIVITY_TYPES } },
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: { occurredAt: true },
        },
      },
    });

    return leads
      .map<CrmDashboardAttentionLead | null>((lead) => {
        const lastContactAt = lead.activities[0]?.occurredAt ?? null;
        const activityReference = lastContactAt ?? lead.createdAt;
        const daysWithoutActivity = Math.max(
          0,
          Math.floor(
            (referenceDate.getTime() - activityReference.getTime()) / DAY_MS,
          ),
        );
        const reasons: CrmAttentionReason[] = [];

        if (!lead.assignedTo) reasons.push(CrmAttentionReason.UNASSIGNED);
        if (!lastContactAt) reasons.push(CrmAttentionReason.WITHOUT_ACTIVITY);
        if (lead.status.code === 'NEW' && !lastContactAt) {
          reasons.push(CrmAttentionReason.NEW_WITHOUT_CONTACT);
        }
        if (lead.status.code === 'PENDING_CONTACT') {
          reasons.push(CrmAttentionReason.PENDING_CONTACT);
        }
        if (
          ['INTERESTED', 'FOLLOW_UP'].includes(lead.status.code) &&
          daysWithoutActivity >=
            CRM_FOLLOW_UP_THRESHOLDS_DAYS.interestedOrFollowUp
        ) {
          reasons.push(CrmAttentionReason.STALE_FOLLOW_UP);
        }

        if (reasons.length === 0) return null;

        return {
          id: lead.id,
          company: lead.company,
          contactName: lead.contactName,
          status: lead.status,
          assignedTo: lead.assignedTo,
          lastContactAt: lastContactAt?.toISOString() ?? null,
          daysWithoutActivity,
          priority: this.resolveAttentionPriority(reasons, daysWithoutActivity),
          reasons,
        };
      })
      .filter((lead): lead is CrmDashboardAttentionLead => lead !== null)
      .sort((left, right) => {
        const priorityDifference =
          this.priorityWeight(right.priority) -
          this.priorityWeight(left.priority);
        return (
          priorityDifference ||
          right.daysWithoutActivity - left.daysWithoutActivity
        );
      })
      .slice(0, CRM_DASHBOARD_ATTENTION_LIMIT);
  }

  private resolveAttentionPriority(
    reasons: CrmAttentionReason[],
    daysWithoutActivity: number,
  ): CrmAttentionPriority {
    const isNewOrPending = reasons.some((reason) =>
      [
        CrmAttentionReason.NEW_WITHOUT_CONTACT,
        CrmAttentionReason.PENDING_CONTACT,
      ].includes(reason),
    );

    if (
      isNewOrPending &&
      daysWithoutActivity >= CRM_FOLLOW_UP_THRESHOLDS_DAYS.newOrPendingContact
    ) {
      return CrmAttentionPriority.HIGH;
    }
    if (
      isNewOrPending ||
      reasons.includes(CrmAttentionReason.STALE_FOLLOW_UP)
    ) {
      return CrmAttentionPriority.MEDIUM;
    }
    return CrmAttentionPriority.LOW;
  }

  private priorityWeight(priority: CrmAttentionPriority): number {
    return {
      [CrmAttentionPriority.HIGH]: 3,
      [CrmAttentionPriority.MEDIUM]: 2,
      [CrmAttentionPriority.LOW]: 1,
    }[priority];
  }

  private resolvePeriod(query: CrmDashboardQueryDto): ResolvedDashboardPeriod {
    const today = this.currentDateInDashboardTimezone();
    const to = query.to ?? today;
    const toDateOnly = this.parseDateOnly(to);
    const defaultFromDate = new Date(
      toDateOnly.getTime() - (CRM_DASHBOARD_DEFAULT_PERIOD_DAYS - 1) * DAY_MS,
    );
    const from = query.from ?? this.formatDateOnly(defaultFromDate);
    const fromDateOnly = this.parseDateOnly(from);
    const periodDays =
      Math.round((toDateOnly.getTime() - fromDateOnly.getTime()) / DAY_MS) + 1;

    if (periodDays < 1) {
      throw new BadRequestException(
        'La fecha inicial debe ser anterior o igual a la fecha final.',
      );
    }
    if (periodDays > CRM_DASHBOARD_MAX_PERIOD_DAYS) {
      throw new BadRequestException(
        `El rango no puede superar ${CRM_DASHBOARD_MAX_PERIOD_DAYS} días.`,
      );
    }

    const toExclusiveDateOnly = new Date(toDateOnly.getTime() + DAY_MS);

    return {
      period: { from, to, timezone: CRM_DASHBOARD_TIMEZONE },
      fromDate: new Date(`${from}T00:00:00${CRM_DASHBOARD_UTC_OFFSET}`),
      toExclusive: new Date(
        `${this.formatDateOnly(toExclusiveDateOnly)}T00:00:00${CRM_DASHBOARD_UTC_OFFSET}`,
      ),
    };
  }

  private currentDateInDashboardTimezone(): string {
    return this.formatDateInDashboardTimezone(new Date());
  }

  private formatDateInDashboardTimezone(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CRM_DASHBOARD_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    return `${values.year}-${values.month}-${values.day}`;
  }

  private parseDateOnly(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
