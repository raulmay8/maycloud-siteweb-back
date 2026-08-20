export class PrismaClient {
  $connect(): Promise<void> {
    return Promise.resolve();
  }

  $disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

export const AnalyticsEventType = {
  CONTACT_FORM_INTERACTION: 'CONTACT_FORM_INTERACTION',
} as const;
