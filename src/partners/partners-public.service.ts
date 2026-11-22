import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { TurnstileService } from '../common/security/turnstile.service';
import { PrismaService } from '../database/prisma.service';
import { PartnerStatus } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';

import type { RegisterPartnerDto } from './dto/register-partner.dto';

@Injectable()
export class PartnersPublicService {
  private readonly logger = new Logger(PartnersPublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly turnstile: TurnstileService,
  ) {}

  // =========================================================
  // REGISTER PARTNER AND REFERRAL
  // =========================================================

  async register(dto: RegisterPartnerDto, remoteIp?: string) {
    if (dto.website) {
      return { received: true };
    }

    await this.turnstile.verify({
      token: dto.turnstileToken,
      remoteIp,
      expectedAction: this.config.getOrThrow<string>(
        'TURNSTILE_PARTNER_REGISTER_ACTION',
      ),
    });

    const creatorId = this.config.get<string>(
      'PARTNERS_PUBLIC_CREATOR_USER_ID',
    );

    if (!creatorId) {
      throw new ServiceUnavailableException(
        'El registro de socios no está disponible.',
      );
    }

    const partnerEmail = this.normalizeEmail(dto.partner.email);

    const serviceOfferingIds = [...new Set(dto.client.serviceOfferingIds)];

    if (serviceOfferingIds.length !== dto.client.serviceOfferingIds.length) {
      throw new BadRequestException('No se permiten servicios duplicados.');
    }

    // =====================================================
    // VALIDATE REFERENCES
    // =====================================================

    const [creator, initialStatus, offerings] = await Promise.all([
      this.prisma.user.findUnique({
        where: {
          id: creatorId,
        },
        select: {
          id: true,
          isActive: true,
        },
      }),

      this.prisma.crmLeadStatus.findUnique({
        where: {
          code: 'NEW',
        },
        select: {
          id: true,
          isActive: true,
        },
      }),

      this.prisma.crmServiceOffering.findMany({
        where: {
          id: {
            in: serviceOfferingIds,
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    if (!creator?.isActive || !initialStatus?.isActive) {
      throw new ServiceUnavailableException(
        'No fue posible configurar el registro de socios.',
      );
    }

    if (offerings.length !== serviceOfferingIds.length) {
      throw new BadRequestException(
        'Uno o más servicios seleccionados no son válidos.',
      );
    }

    const offeringNames = serviceOfferingIds.map((id) => {
      const offering = offerings.find((item) => item.id === id);

      return offering!.name;
    });

    // =====================================================
    // DATABASE TRANSACTION
    // =====================================================

    const result = await this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.upsert({
        where: {
          email: partnerEmail,
        },
        create: {
          name: dto.partner.name.trim(),
          email: partnerEmail,
          phone: dto.partner.phone?.trim() || null,
          country: dto.partner.country?.trim() || null,
          status: PartnerStatus.ACTIVE,
        },
        update: {},
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          country: true,
          status: true,
        },
      });

      // No aceptamos nuevas recomendaciones de socios
      // desactivados o bloqueados.
      if (partner.status !== PartnerStatus.ACTIVE) {
        return {
          created: false as const,
        };
      }

      const description = dto.client.description?.trim() || null;

      const noteContent = [
        'Prospecto recibido mediante el Programa de Socios de MayCloud.',
        description ? `Descripción del proyecto:\n${description}` : null,
      ]
        .filter(Boolean)
        .join('\n\n');

      // =================================================
      // CREATE CRM LEAD
      // =================================================

      const lead = await tx.crmLead.create({
        data: {
          company: dto.client.company.trim(),
          contactName: dto.client.contactName?.trim() || null,
          email: dto.client.email?.trim().toLowerCase() || null,
          phone: dto.client.phone?.trim() || null,

          partnerId: partner.id,
          createdById: creatorId,
          statusId: initialStatus.id,

          serviceOfferings: {
            create: serviceOfferingIds.map((serviceOfferingId) => ({
              serviceOfferingId,
            })),
          },

          notes: {
            create: {
              content: noteContent,
              createdById: creatorId,
            },
          },
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      return {
        created: true as const,
        lead,
        partner,
      };
    });

    // Respuesta genérica sin revelar el estado del socio.
    if (!result.created) {
      return {
        received: true,
      };
    }

    // =====================================================
    // PREPARE EMAIL DATA
    // =====================================================

    const { lead, partner } = result;
    const createdAt = lead.createdAt;

    // =====================================================
    // SEND EMAIL NOTIFICATIONS
    // =====================================================

    const notifications = await Promise.allSettled([
      // Confirmación al socio
      this.mail.sendPartnerRegistrationEmail({
        locale: 'es',
        partnerName: partner.name,
        partnerEmail: partner.email,
        company: dto.client.company.trim(),
        services: offeringNames,
        createdAt,
      }),

      // Notificación interna a MayCloud
      this.mail.sendPartnerRegistrationAdminEmail({
        locale: 'es',
        createdAt,

        partnerName: partner.name,
        partnerEmail: partner.email,
        partnerPhone: partner.phone,
        partnerCountry: partner.country,

        company: dto.client.company.trim(),
        contactName: dto.client.contactName?.trim() || null,
        contactEmail: dto.client.email?.trim().toLowerCase() || null,
        contactPhone: dto.client.phone?.trim() || null,

        services: offeringNames,
        description: dto.client.description?.trim() || null,
      }),
    ]);

    notifications.forEach((notification, index) => {
      if (notification.status !== 'rejected') {
        return;
      }

      const recipient = index === 0 ? 'socio' : 'administración';

      this.logger.error(
        `No fue posible enviar el correo a ${recipient}. Lead: ${lead.id}`,
        notification.reason instanceof Error
          ? notification.reason.stack
          : String(notification.reason),
      );
    });

    return {
      received: true,
    };
  }

  // =========================================================
  // NORMALIZE EMAIL
  // =========================================================

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
