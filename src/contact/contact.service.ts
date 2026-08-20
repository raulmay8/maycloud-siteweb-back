import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { ContactMessageStatus } from '../generated/prisma/client';
import type { CreateContactMessageDto } from './dto/create-contact-message.dto';
import type { ListContactMessagesQueryDto } from './dto/list-contact-messages-query.dto';
import type { ReadableContactMessageStatus } from './dto/update-contact-message-status.dto';
import { TurnstileService } from './turnstile.service';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly turnstile: TurnstileService,
    private readonly notifications: NotificationsGateway,
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

  async updateStatus(id: string, status: ReadableContactMessageStatus) {
    const existing = await this.prisma.contactMessage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing)
      throw new NotFoundException('Mensaje de contacto no encontrado');

    const message = await this.prisma.contactMessage.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });
    const newCount = await this.prisma.contactMessage.count({
      where: { status: ContactMessageStatus.NEW },
    });
    this.notifications.emitContactNotificationUpdated({ newCount });
    return message;
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
      select: { id: true, createdAt: true },
    });
    this.notifications.emitContactMessageCreated({
      id: contact.id,
      createdAt: contact.createdAt.toISOString(),
    });
    return { reference: contact.id };
  }
}
