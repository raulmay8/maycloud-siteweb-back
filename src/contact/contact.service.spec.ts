import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ContactService } from './contact.service';
import { TurnstileService } from './turnstile.service';

describe('ContactService', () => {
  let service: ContactService;
  const create = jest.fn();
  const findMany = jest.fn();
  const count = jest.fn();
  const transaction = jest.fn();
  const verify = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: PrismaService,
          useValue: {
            contactMessage: { create, findMany, count },
            $transaction: transaction,
          },
        },
        { provide: TurnstileService, useValue: { verify } },
      ],
    }).compile();
    service = module.get(ContactService);
  });

  it('returns contact messages ordered and paginated', async () => {
    const messages = [{ id: 'contact-id', subject: 'Nuevo proyecto' }];
    findMany.mockResolvedValue(messages);
    count.mockResolvedValue(21);

    await expect(service.findAll({ page: 2, pageSize: 10 })).resolves.toEqual({
      items: messages,
      pagination: { page: 2, pageSize: 10, total: 21, totalPages: 3 },
    });
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('validates and stores a contact message', async () => {
    create.mockResolvedValue({ id: 'contact-id' });
    await expect(
      service.create(
        {
          name: 'María López',
          email: 'MARIA@EMPRESA.COM',
          subject: 'Nuevo proyecto',
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
        subject: 'Nuevo proyecto',
        message: 'Quiero conversar sobre un proyecto.',
      },
      select: { id: true },
    });
  });

  it('silently discards submissions that fill the honeypot', async () => {
    const result = await service.create({
      name: 'Bot',
      email: 'bot@example.com',
      subject: 'Spam',
      message: 'Este mensaje no debe guardarse.',
      website: 'https://spam.example.com',
    });
    expect(result.reference).toBeDefined();
    expect(verify).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
