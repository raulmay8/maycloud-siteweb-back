import { CrmActivityType } from '../generated/prisma/client';

export const CRM_DASHBOARD_TIMEZONE = 'America/Cancun' as const;
export const CRM_DASHBOARD_UTC_OFFSET = '-05:00' as const;

export const CRM_DASHBOARD_DEFAULT_PERIOD_DAYS = 30;
export const CRM_DASHBOARD_MAX_PERIOD_DAYS = 366;

export const CRM_FOLLOW_UP_THRESHOLDS_DAYS = {
  newOrPendingContact: 3,
  interestedOrFollowUp: 5,
} as const;

export const CRM_DASHBOARD_RECENT_ACTIVITY_LIMIT = 10;
export const CRM_DASHBOARD_ATTENTION_LIMIT = 20;

export const CRM_CONTACT_ACTIVITY_TYPES: CrmActivityType[] = [
  CrmActivityType.PHONE_CALL,
  CrmActivityType.EMAIL,
  CrmActivityType.WHATSAPP,
  CrmActivityType.MEETING,
  CrmActivityType.OTHER,
];
