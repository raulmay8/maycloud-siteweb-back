import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AnalyticsEventType } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnalyticsService } from './analytics.service';

jest.mock('node:crypto', () => ({ randomUUID: jest.fn() }));

const generatedToken = 'f39190fb-02a7-4932-8c4d-9a22f294a146';
const now = new Date('2026-08-19T15:00:00.000Z');

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const sessionFindFirst = jest.fn();
  const sessionCreate = jest.fn();
  const sessionUpdate = jest.fn();
  const eventUpsert = jest.fn();
  const transaction = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.mocked(randomUUID).mockReturnValue(generatedToken);
    sessionCreate.mockResolvedValue({});
    sessionUpdate.mockResolvedValue({});
    eventUpsert.mockResolvedValue({});
    transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            analyticsSession: {
              findFirst: sessionFindFirst,
              create: sessionCreate,
              update: sessionUpdate,
            },
            analyticsEvent: { upsert: eventUpsert },
            $transaction: transaction,
          },
        },
      ],
    }).compile();
    service = module.get(AnalyticsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a new anonymous session when there is no active cookie', async () => {
    const result = await service.startSession({
      landingPath: '/',
      referrerHost: 'google.com',
    });

    expect(result).toEqual({
      sessionToken: generatedToken,
      visitorToken: generatedToken,
      isNewSession: true,
    });
    expect(sessionCreate).toHaveBeenCalledWith({
      data: {
        sessionToken: result.sessionToken,
        visitorToken: result.visitorToken,
        landingPath: '/',
        referrerHost: 'google.com',
        startedAt: now,
        lastActivityAt: now,
      },
    });
  });

  it('reuses an active session and refreshes its activity', async () => {
    const sessionToken = '9a14748d-79eb-48fb-93cf-604d760640d1';
    const visitorToken = '582afad2-b5ab-4a7d-b680-20a9ac1b83be';
    sessionFindFirst.mockResolvedValue({ id: 10n, visitorToken });

    await expect(
      service.startSession({ landingPath: '/servicios' }, sessionToken),
    ).resolves.toEqual({
      sessionToken,
      visitorToken,
      isNewSession: false,
    });
    expect(sessionCreate).not.toHaveBeenCalled();
    expect(sessionUpdate).toHaveBeenCalledWith({
      where: { id: 10n },
      data: {
        lastActivityAt: now,
        visitorToken,
      },
    });
  });

  it('rejects an interaction without a valid active session', async () => {
    await expect(
      service.recordContactFormInteraction(undefined, { pagePath: '/' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(eventUpsert).not.toHaveBeenCalled();
  });

  it('records the contact interaction idempotently and refreshes the session', async () => {
    const sessionToken = '9a14748d-79eb-48fb-93cf-604d760640d1';
    sessionFindFirst.mockResolvedValue({ id: 10n });

    await expect(
      service.recordContactFormInteraction(sessionToken, { pagePath: '/' }),
    ).resolves.toEqual({ recorded: true });
    expect(eventUpsert).toHaveBeenCalledWith({
      where: {
        sessionId_type: {
          sessionId: 10n,
          type: AnalyticsEventType.CONTACT_FORM_INTERACTION,
        },
      },
      create: {
        eventToken: generatedToken,
        sessionId: 10n,
        type: AnalyticsEventType.CONTACT_FORM_INTERACTION,
        pagePath: '/',
        occurredAt: now,
      },
      update: {},
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
