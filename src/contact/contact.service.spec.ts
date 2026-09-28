import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ContactService } from './contact.service';
import { TurnstileService } from './turnstile.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { ContactMessageStatus } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';

describe('ContactService', () => {
  let service: ContactService;
  const create = jest.fn();
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const update = jest.fn();
  const count = jest.fn();
  const transaction = jest.fn();
  const verify = jest.fn();
  const findStage = jest.fn();
  const findOptions = jest.fn();
  const findStages = jest.fn();
  const findDefaultLanguage = jest.fn();
  const findLanguage = jest.fn();
  const emitContactMessageCreated = jest.fn();
  const emitContactNotificationUpdated = jest.fn();
  const sendContactEmails = jest.fn();

  beforeEach(async () => {
    jest.resetAllMocks();
    findStage.mockResolvedValue({
      id: 'stage-id',
      code: 'IDEA',
      translations: [{ name: 'Idea' }],
    });
    findOptions.mockResolvedValue([
      { id: 'option-id', code: 'WEB', translations: [{ name: 'Sitio web' }] },
    ]);
    sendContactEmails.mockResolvedValue(undefined);
    findStages.mockResolvedValue([]);
    findDefaultLanguage.mockResolvedValue({
      id: 'es-id',
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
    });
    const prismaMock = {
      contactMessage: { create, findMany, findUnique, update, count },
      projectStage: { findFirst: findStage, findMany: findStages },
      developmentOption: { findMany: findOptions },
      language: { findFirst: findDefaultLanguage, findUnique: findLanguage },
    };
    transaction.mockImplementation(
      async (
        operations:
          | Promise<unknown>[]
          | ((client: typeof prismaMock) => Promise<unknown>),
      ) =>
        typeof operations === 'function'
          ? operations(prismaMock)
          : Promise.all(operations),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: PrismaService,
          useValue: {
            ...prismaMock,
            $transaction: transaction,
          },
        },
        { provide: TurnstileService, useValue: { verify } },
        {
          provide: NotificationsGateway,
          useValue: {
            emitContactMessageCreated,
            emitContactNotificationUpdated,
          },
        },
        { provide: MailService, useValue: { sendContactEmails } },
      ],
    }).compile();
    service = module.get(ContactService);
  });

  it('marks a contact message as read and publishes the new count', async () => {
    const updatedAt = new Date('2026-08-19T16:00:00.000Z');
    findUnique.mockResolvedValue({ id: 'contact-id' });
    update.mockResolvedValue({
      id: 'contact-id',
      status: ContactMessageStatus.READ,
      updatedAt,
    });
    count.mockResolvedValue(3);

    await expect(
      service.updateStatus('contact-id', ContactMessageStatus.READ),
    ).resolves.toEqual({
      id: 'contact-id',
      status: ContactMessageStatus.READ,
      updatedAt,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'contact-id' },
      data: { status: ContactMessageStatus.READ },
      select: { id: true, status: true, updatedAt: true },
    });
    expect(count).toHaveBeenCalledWith({
      where: { status: ContactMessageStatus.NEW },
    });
    expect(emitContactNotificationUpdated).toHaveBeenCalledWith({
      newCount: 3,
    });
  });

  it('returns contact messages ordered and paginated', async () => {
    const messages = [
      {
        id: 'contact-id',
        companyOrProject: 'Nuevo proyecto',
        projectStage: { id: 'stage-id', code: 'IDEA', translations: [] },
        developmentOptions: [
          {
            developmentOption: {
              id: 'option-id',
              code: 'WEB',
              translations: [{ name: 'Sitio web', description: null }],
            },
          },
        ],
      },
    ];
    findMany.mockResolvedValue(messages);
    count.mockResolvedValue(21);

    await expect(service.findAll({ page: 2, pageSize: 10 })).resolves.toEqual({
      items: [
        {
          id: 'contact-id',
          companyOrProject: 'Nuevo proyecto',
          projectStage: {
            id: 'stage-id',
            code: 'IDEA',
            name: 'IDEA',
            description: null,
          },
          developmentOptions: [
            {
              id: 'option-id',
              code: 'WEB',
              name: 'Sitio web',
              description: null,
            },
          ],
        },
      ],
      pagination: { page: 2, pageSize: 10, total: 21, totalPages: 3 },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      }),
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('validates and stores a contact message', async () => {
    const createdAt = new Date('2026-08-19T15:00:00.000Z');
    create.mockResolvedValue({ id: 'contact-id', createdAt });
    await expect(
      service.create(
        {
          name: 'María López',
          email: 'MARIA@EMPRESA.COM',
          companyOrProject: 'Nuevo proyecto',
          projectStageId: 'stage-id',
          developmentOptionIds: ['option-id'],
          message: 'Quiero conversar sobre un proyecto.',
          turnstileToken: 'token',
        },
        '127.0.0.1',
      ),
    ).resolves.toEqual({ reference: 'contact-id' });
    expect(verify).toHaveBeenCalledWith('token', '127.0.0.1');
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'María López',
        email: 'maria@empresa.com',
        companyOrProject: 'Nuevo proyecto',
        phone: null,
        projectStageId: 'stage-id',
        developmentOptions: { create: [{ developmentOptionId: 'option-id' }] },
        message: 'Quiero conversar sobre un proyecto.',
      },
      select: { id: true, createdAt: true },
    });
    expect(emitContactMessageCreated).toHaveBeenCalledWith({
      id: 'contact-id',
      createdAt: '2026-08-19T15:00:00.000Z',
    });
    expect(sendContactEmails).toHaveBeenCalledWith({
      reference: 'contact-id',
      locale: 'es',
      name: 'Mar\u00eda L\u00f3pez',
      companyOrProject: 'Nuevo proyecto',
      email: 'maria@empresa.com',
      phone: null,
      projectStage: 'Idea',
      developmentOptions: ['Sitio web'],
      message: 'Quiero conversar sobre un proyecto.',
      createdAt,
    });
  });

  it('silently discards submissions that fill the honeypot', async () => {
    const result = await service.create({
      name: 'Bot',
      email: 'bot@example.com',
      projectStageId: 'stage-id',
      message: 'Este mensaje no debe guardarse.',
      website: 'https://spam.example.com',
      developmentOptionIds: ['option-id'],
    });
    expect(result.reference).toBeDefined();
    expect(verify).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(emitContactMessageCreated).not.toHaveBeenCalled();
    expect(sendContactEmails).not.toHaveBeenCalled();
  });

  it('rejects an unavailable project stage before storing the message', async () => {
    findStage.mockResolvedValue(null);
    await expect(
      service.create({
        name: 'Cliente',
        email: 'cliente@example.com',
        projectStageId: 'missing-stage',
        developmentOptionIds: ['option-id'],
        message: 'Quiero crear un proyecto.',
      }),
    ).rejects.toThrow('La etapa del proyecto seleccionada no es válida');
    expect(create).not.toHaveBeenCalled();
    expect(emitContactMessageCreated).not.toHaveBeenCalled();
  });

  it('rejects unavailable development options before storing the message', async () => {
    findOptions.mockResolvedValue([]);
    await expect(
      service.create({
        name: 'Cliente',
        email: 'cliente@example.com',
        projectStageId: 'stage-id',
        developmentOptionIds: ['missing-option'],
        message: 'Quiero crear un proyecto.',
      }),
    ).rejects.toThrow('Una o más opciones de desarrollo no son válidas');
    expect(create).not.toHaveBeenCalled();
    expect(emitContactMessageCreated).not.toHaveBeenCalled();
  });
  it('uses the requested translation, then the default language, then the code', async () => {
    findLanguage.mockResolvedValue({
      id: 'en-id',
      code: 'en',
      name: 'English',
      nativeName: 'English',
      isActive: true,
    });
    findOptions.mockResolvedValue([
      {
        id: 'a',
        code: 'WEB',
        translations: [
          { languageId: 'es-id', name: 'Sitio web', description: null },
          {
            languageId: 'en-id',
            name: 'Website',
            description: 'Web development',
          },
        ],
      },
      {
        id: 'b',
        code: 'APP',
        translations: [
          { languageId: 'es-id', name: 'Aplicación', description: null },
        ],
      },
    ]);
    findStages.mockResolvedValue([
      { id: 'stage-id', code: 'IDEA', translations: [] },
    ]);
    await expect(service.getCatalogs({ locale: 'EN' })).resolves.toEqual({
      language: { code: 'en', name: 'English', nativeName: 'English' },
      developmentOptions: [
        {
          id: 'a',
          code: 'WEB',
          name: 'Website',
          description: 'Web development',
        },
        { id: 'b', code: 'APP', name: 'Aplicación', description: null },
      ],
      projectStages: [
        { id: 'stage-id', code: 'IDEA', name: 'IDEA', description: null },
      ],
    });
    expect(findLanguage).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: 'en' } }),
    );
  });

  it('rejects catalogs when no active default language exists', async () => {
    findDefaultLanguage.mockResolvedValue(null);
    await expect(service.getCatalogs({})).rejects.toThrow(
      'No hay un idioma predeterminado disponible',
    );
  });

  it('rejects an inactive requested language', async () => {
    findLanguage.mockResolvedValue({ isActive: false });
    await expect(service.getCatalogs({ locale: 'en' })).rejects.toThrow(
      'Idioma no disponible',
    );
  });

  it('does not notify when storing the contact fails', async () => {
    create.mockRejectedValue(new Error('Database failure'));
    await expect(
      service.create({
        name: 'Cliente',
        email: 'cliente@example.com',
        projectStageId: 'stage-id',
        developmentOptionIds: ['option-id'],
        message: 'Quiero crear un proyecto.',
      }),
    ).rejects.toThrow('Database failure');
    expect(emitContactMessageCreated).not.toHaveBeenCalled();
  });
});
