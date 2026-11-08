import type { CrmActivityType } from '../generated/prisma/client';

export interface CrmDashboardPeriod {
  from: string;
  to: string;
  timezone: 'America/Cancun';
}

export interface CrmDashboardSummary {
  totalActiveLeads: number;
  newLeads: number;
  pendingContact: number;
  contacted: number;
  converted: number;
  unassigned: number;
  withoutActivity: number;
  conversionRate: number;
}

export interface CrmDashboardPipelineStage {
  statusId: string;
  code: string;
  name: string;
  color: string | null;
  sortOrder: number;
  isFinal: boolean;
  leadCount: number;
  percentage: number;
}

export enum CrmAttentionPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum CrmAttentionReason {
  NEW_WITHOUT_CONTACT = 'NEW_WITHOUT_CONTACT',
  PENDING_CONTACT = 'PENDING_CONTACT',
  STALE_FOLLOW_UP = 'STALE_FOLLOW_UP',
  WITHOUT_ACTIVITY = 'WITHOUT_ACTIVITY',
  UNASSIGNED = 'UNASSIGNED',
}

export interface CrmDashboardPerson {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface CrmDashboardAttentionLead {
  id: string;
  company: string;
  contactName: string | null;
  status: {
    id: string;
    code: string;
    name: string;
    color: string | null;
  };
  assignedTo: CrmDashboardPerson | null;
  lastContactAt: string | null;
  daysWithoutActivity: number;
  priority: CrmAttentionPriority;
  reasons: CrmAttentionReason[];
}

export interface CrmDashboardRecentActivity {
  id: string;
  type: CrmActivityType;
  description: string | null;
  occurredAt: string;
  lead: {
    id: string;
    company: string;
    contactName: string | null;
  };
  performedBy: CrmDashboardPerson;
}

export interface CrmDashboardDailyTrend {
  date: string;
  created: number;
  converted: number;
  activities: number;
}

export interface CrmDashboardResponse {
  period: CrmDashboardPeriod;
  summary: CrmDashboardSummary;
  pipeline: CrmDashboardPipelineStage[];
  attentionRequired: CrmDashboardAttentionLead[];
  recentActivity: CrmDashboardRecentActivity[];
  dailyTrend: CrmDashboardDailyTrend[];
}
