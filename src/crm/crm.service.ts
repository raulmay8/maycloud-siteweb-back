import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CrmActivityType,
  CrmEmailStatus,
  Prisma,
} from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import type {
  CreateCrmActivityDto,
  CreateCrmLeadDto,
  CrmEmailDto,
  ListCrmLeadsQueryDto,
  UpdateCrmLeadDto,
} from './dto/crm-lead.dto';

const personSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

const leadDetailInclude = {
  status: true,
  businessType: true,
  createdBy: { select: personSelect },
  assignedTo: { select: personSelect },
  categories: { include: { category: true } },
  digitalAssets: { include: { digitalAsset: true } },
  serviceOfferings: { include: { serviceOffering: true } },
  links: { orderBy: { createdAt: 'asc' as const } },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    include: { createdBy: { select: personSelect } },
  },
  activities: {
    orderBy: { occurredAt: 'desc' as const },
    include: { performedBy: { select: personSelect } },
  },
  emails: {
    orderBy: { createdAt: 'desc' as const },
    include: { sender: { select: personSelect } },
  },
  _count: {
    select: {
      notes: true,
      activities: true,
      emails: { where: { status: CrmEmailStatus.SENT } },
    },
  },
} as const;

type LeadDetail = Prisma.CrmLeadGetPayload<{
  include: typeof leadDetailInclude;
}>;

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async getCatalogs() {
    const [statuses, businessTypes, categories, digitalAssets, offerings] =
      await this.prisma.$transaction([
        this.prisma.crmLeadStatus.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.crmBusinessType.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.crmLeadCategory.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.crmDigitalAsset.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.crmServiceOffering.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        }),
      ]);

    return { statuses, businessTypes, categories, digitalAssets, offerings };
  }

  async findAll(query: ListCrmLeadsQueryDto) {
    const where = {
      ...(query.statusId ? { statusId: query.statusId } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                company: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                contactName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                phone: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                city: { contains: query.search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.crmLead.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          status: true,
          businessType: true,
          assignedTo: { select: personSelect },
          categories: { include: { category: true } },
          activities: {
            take: 1,
            where: {
              type: {
                in: [
                  CrmActivityType.PHONE_CALL,
                  CrmActivityType.EMAIL,
                  CrmActivityType.WHATSAPP,
                  CrmActivityType.MEETING,
                  CrmActivityType.OTHER,
                ],
              },
            },
            orderBy: { occurredAt: 'desc' },
            include: { performedBy: { select: personSelect } },
          },
          _count: {
            select: {
              notes: true,
              activities: true,
              emails: { where: { status: CrmEmailStatus.SENT } },
            },
          },
        },
      }),
      this.prisma.crmLead.count({ where }),
    ]);

    return {
      items: items.map(({ activities, _count, ...lead }) => ({
        ...lead,
        categories: lead.categories.map(({ category }) => category),
        lastContact: activities[0] ?? null,
        hasNotes: _count.notes > 0,
        hasSentEmails: _count.emails > 0,
        hasActivities: _count.activities > 0,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async findOne(id: string) {
    const lead = await this.prisma.crmLead.findUnique({
      where: { id },
      include: leadDetailInclude,
    });
    if (!lead) throw new NotFoundException('Prospecto no encontrado');
    return this.mapDetail(lead);
  }

  async create(dto: CreateCrmLeadDto, actorId: string) {
    await this.validateReferences(dto);
    const lead = await this.prisma.crmLead.create({
      data: {
        company: dto.company,
        contactName: dto.contactName || null,
        position: dto.position || null,
        phone: dto.phone || null,
        email: dto.email?.toLowerCase() || null,
        address: dto.address || null,
        city: dto.city || null,
        statusId: dto.statusId,
        businessTypeId: dto.businessTypeId || null,
        assignedToId: dto.assignedToId || null,
        createdById: actorId,
        categories: dto.categoryIds?.length
          ? { create: dto.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        digitalAssets: dto.digitalAssets?.length
          ? { create: dto.digitalAssets }
          : undefined,
        serviceOfferings: dto.serviceOfferings?.length
          ? { create: dto.serviceOfferings }
          : undefined,
        links: dto.links?.length ? { create: dto.links } : undefined,
      },
      include: leadDetailInclude,
    });
    return this.mapDetail(lead);
  }

  async update(id: string, dto: UpdateCrmLeadDto, actorId: string) {
    const current = await this.requireLead(id);
    await this.validateReferences(dto);

    await this.prisma.$transaction(async (tx) => {
      await tx.crmLead.update({
        where: { id },
        data: {
          company: dto.company,
          contactName: dto.contactName,
          position: dto.position,
          phone: dto.phone,
          email: dto.email?.toLowerCase(),
          address: dto.address,
          city: dto.city,
          statusId: dto.statusId,
          businessTypeId: dto.businessTypeId,
          assignedToId: dto.assignedToId,
        },
      });

      if (dto.categoryIds) {
        await tx.crmLeadCategoryAssignment.deleteMany({
          where: { leadId: id },
        });
        if (dto.categoryIds.length) {
          await tx.crmLeadCategoryAssignment.createMany({
            data: dto.categoryIds.map((categoryId) => ({
              leadId: id,
              categoryId,
            })),
          });
        }
      }
      if (dto.digitalAssets) {
        await tx.crmLeadDigitalAsset.deleteMany({ where: { leadId: id } });
        if (dto.digitalAssets.length) {
          await tx.crmLeadDigitalAsset.createMany({
            data: dto.digitalAssets.map((item) => ({ leadId: id, ...item })),
          });
        }
      }
      if (dto.serviceOfferings) {
        await tx.crmLeadServiceOffering.deleteMany({ where: { leadId: id } });
        if (dto.serviceOfferings.length) {
          await tx.crmLeadServiceOffering.createMany({
            data: dto.serviceOfferings.map((item) => ({ leadId: id, ...item })),
          });
        }
      }
      if (dto.links) {
        await tx.crmLeadLink.deleteMany({ where: { leadId: id } });
        if (dto.links.length) {
          await tx.crmLeadLink.createMany({
            data: dto.links.map((item) => ({ leadId: id, ...item })),
          });
        }
      }
      if (dto.statusId && dto.statusId !== current.statusId) {
        await tx.crmLeadActivity.create({
          data: {
            leadId: id,
            type: CrmActivityType.STATUS_CHANGE,
            performedById: actorId,
            description: 'Estado del prospecto actualizado',
          },
        });
      }
    });
    return this.findOne(id);
  }

  async addNote(id: string, content: string, actorId: string) {
    await this.requireLead(id);
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.crmLeadNote.create({
        data: { leadId: id, content, createdById: actorId },
        include: { createdBy: { select: personSelect } },
      });
      await tx.crmLeadActivity.create({
        data: {
          leadId: id,
          type: CrmActivityType.NOTE,
          performedById: actorId,
          description: 'Nota administrativa agregada',
        },
      });
      return note;
    });
  }

  async addActivity(id: string, dto: CreateCrmActivityDto, actorId: string) {
    await this.requireLead(id);
    return this.prisma.crmLeadActivity.create({
      data: {
        leadId: id,
        type: dto.type,
        description: dto.description || null,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        performedById: actorId,
      },
      include: { performedBy: { select: personSelect } },
    });
  }

  async previewEmail(id: string, dto: CrmEmailDto) {
    const lead = await this.requireLead(id);
    const recipient = dto.recipient ?? lead.email;
    if (!recipient) {
      throw new BadRequestException('El prospecto no tiene correo electrónico');
    }
    return {
      recipient,
      locale: dto.locale,
      ...(await this.mail.renderCrmEmail(dto.subject, dto.content, dto.locale)),
    };
  }

  async sendEmail(id: string, dto: CrmEmailDto, actorId: string) {
    const lead = await this.requireLead(id);
    const recipient = (dto.recipient ?? lead.email)?.toLowerCase();
    if (!recipient) {
      throw new BadRequestException('El prospecto no tiene correo electrónico');
    }
    const email = await this.prisma.crmEmail.create({
      data: {
        leadId: id,
        senderUserId: actorId,
        recipient,
        locale: dto.locale,
        subject: dto.subject,
        content: dto.content,
      },
    });

    try {
      const result = await this.mail.sendCrmEmail({
        recipient,
        subject: dto.subject,
        content: dto.content,
        locale: dto.locale,
      });
      const sentAt = new Date();
      const sent = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.crmEmail.update({
          where: { id: email.id },
          data: {
            status: CrmEmailStatus.SENT,
            providerMessageId: result.messageId,
            sentAt,
          },
        });
        await tx.crmLeadActivity.create({
          data: {
            leadId: id,
            type: CrmActivityType.EMAIL,
            performedById: actorId,
            occurredAt: sentAt,
            description: `Correo enviado: ${dto.subject}`,
          },
        });
        return updated;
      });
      return sent;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.crmEmail.update({
        where: { id: email.id },
        data: {
          status: CrmEmailStatus.FAILED,
          errorMessage: message.slice(0, 5000),
        },
      });
      throw new BadGatewayException('No fue posible enviar el correo');
    }
  }

  private async requireLead(id: string) {
    const lead = await this.prisma.crmLead.findUnique({
      where: { id },
      select: { id: true, email: true, statusId: true },
    });
    if (!lead) throw new NotFoundException('Prospecto no encontrado');
    return lead;
  }

  private async validateReferences(dto: UpdateCrmLeadDto | CreateCrmLeadDto) {
    const unique = (values: string[] | undefined) => [...new Set(values ?? [])];
    const categoryIds = unique(dto.categoryIds);
    const digitalAssetIds = unique(
      dto.digitalAssets?.map((item) => item.digitalAssetId),
    );
    const offeringIds = unique(
      dto.serviceOfferings?.map((item) => item.serviceOfferingId),
    );
    if (
      categoryIds.length !== (dto.categoryIds?.length ?? 0) ||
      digitalAssetIds.length !== (dto.digitalAssets?.length ?? 0) ||
      offeringIds.length !== (dto.serviceOfferings?.length ?? 0)
    ) {
      throw new BadRequestException('No se permiten relaciones duplicadas');
    }

    const checks: Promise<number | boolean>[] = [];
    if (dto.statusId)
      checks.push(
        this.prisma.crmLeadStatus.count({
          where: { id: dto.statusId, isActive: true },
        }),
      );
    if (dto.businessTypeId)
      checks.push(
        this.prisma.crmBusinessType.count({
          where: { id: dto.businessTypeId, isActive: true },
        }),
      );
    if (dto.assignedToId)
      checks.push(
        this.prisma.user.count({
          where: { id: dto.assignedToId, isActive: true },
        }),
      );
    if (categoryIds.length)
      checks.push(
        this.prisma.crmLeadCategory
          .count({ where: { id: { in: categoryIds }, isActive: true } })
          .then((count) => count === categoryIds.length),
      );
    if (digitalAssetIds.length)
      checks.push(
        this.prisma.crmDigitalAsset
          .count({ where: { id: { in: digitalAssetIds }, isActive: true } })
          .then((count) => count === digitalAssetIds.length),
      );
    if (offeringIds.length)
      checks.push(
        this.prisma.crmServiceOffering
          .count({ where: { id: { in: offeringIds }, isActive: true } })
          .then((count) => count === offeringIds.length),
      );
    const results = await Promise.all(checks);
    if (results.some((result) => result === 0 || result === false)) {
      throw new BadRequestException(
        'Una o más referencias del CRM no son válidas',
      );
    }
  }

  private mapDetail(lead: LeadDetail) {
    const { _count, ...detail } = lead;
    return {
      ...detail,
      categories: lead.categories.map((item) => item.category),
      digitalAssets: lead.digitalAssets.map((item) => ({
        ...item.digitalAsset,
        details: item.details,
      })),
      serviceOfferings: lead.serviceOfferings.map((item) => ({
        ...item.serviceOffering,
        priority: item.priority,
        notes: item.notes,
      })),
      hasNotes: _count.notes > 0,
      hasSentEmails: _count.emails > 0,
      hasActivities: _count.activities > 0,
    };
  }
}
