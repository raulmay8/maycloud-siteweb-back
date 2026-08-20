import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import type { CreateContactMessageDto } from './dto/create-contact-message.dto';
import type { ListContactMessagesQueryDto } from './dto/list-contact-messages-query.dto';
import { TurnstileService } from './turnstile.service';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly turnstile: TurnstileService,
  ) {}

  async findAll(query: ListContactMessagesQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
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
      }),
      this.prisma.contactMessage.count(),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

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
