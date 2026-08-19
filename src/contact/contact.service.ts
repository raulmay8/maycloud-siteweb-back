import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import type { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { TurnstileService } from './turnstile.service';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly turnstile: TurnstileService,
  ) {}

  async create(dto: CreateContactMessageDto, remoteIp?: string) {
    if (dto.website) return { reference: randomUUID() };
    await this.turnstile.verify(dto.turnstileToken, remoteIp);

    const contact = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        subject: dto.subject,
        message: dto.message,
      },
      select: { id: true },
    });
    return { reference: contact.id };
  }
}
