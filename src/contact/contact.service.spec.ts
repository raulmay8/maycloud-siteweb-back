import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ContactService } from './contact.service';
import { TurnstileService } from './turnstile.service';

describe('ContactService', () => {
  let service: ContactService;
  const create = jest.fn();
  const verify = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: PrismaService, useValue: { contactMessage: { create } } },
        { provide: TurnstileService, useValue: { verify } },
      ],
    }).compile();
    service = module.get(ContactService);
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
