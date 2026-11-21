import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { PartnerStatus, Prisma } from '../generated/prisma/client';

import type {
  CreatePartnerDto,
  ListPartnersQueryDto,
  UpdatePartnerDto,
  UpdatePartnerStatusDto,
} from './dto/partner.dto';

const partnerInclude = {
  _count: {
    select: {
      leads: true,
    },
  },
} as const;

type PartnerWithCount = Prisma.PartnerGetPayload<{
  include: typeof partnerInclude;
}>;

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // LIST PARTNERS
  // =========================================================

  async findAll(query: ListPartnersQueryDto) {
    const where: Prisma.PartnerWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                country: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.partner.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: partnerInclude,
      }),

      this.prisma.partner.count({
        where,
      }),
    ]);

    return {
      items: items.map((partner) => this.mapPartner(partner)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  // =========================================================
  // GET PARTNER
  // =========================================================

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: partnerInclude,
    });

    if (!partner) {
      throw new NotFoundException('Socio no encontrado');
    }

    return this.mapPartner(partner);
  }

  // =========================================================
  // CREATE PARTNER
  // =========================================================

  async create(dto: CreatePartnerDto) {
    const email = this.normalizeEmail(dto.email);

    await this.ensureEmailAvailable(email);

    try {
      const partner = await this.prisma.partner.create({
        data: {
          name: dto.name.trim(),
          email,
          phone: dto.phone?.trim() || null,
          country: dto.country?.trim() || null,
          status: PartnerStatus.ACTIVE,
        },
        include: partnerInclude,
      });

      return this.mapPartner(partner);
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  // =========================================================
  // UPDATE PARTNER
  // =========================================================

  async update(id: string, dto: UpdatePartnerDto) {
    await this.requirePartner(id);

    const email = dto.email ? this.normalizeEmail(dto.email) : undefined;

    if (email) {
      await this.ensureEmailAvailable(email, id);
    }

    try {
      const partner = await this.prisma.partner.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          email,
          phone:
            dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
          country:
            dto.country !== undefined ? dto.country?.trim() || null : undefined,
        },
        include: partnerInclude,
      });

      return this.mapPartner(partner);
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  // =========================================================
  // UPDATE PARTNER STATUS
  // =========================================================

  async updateStatus(id: string, dto: UpdatePartnerStatusDto) {
    await this.requirePartner(id);

    const partner = await this.prisma.partner.update({
      where: { id },
      data: {
        status: dto.status,
      },
      include: partnerInclude,
    });

    return this.mapPartner(partner);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async requirePartner(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!partner) {
      throw new NotFoundException('Socio no encontrado');
    }

    return partner;
  }

  private async ensureEmailAvailable(email: string, excludeId?: string) {
    const existing = await this.prisma.partner.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe un socio registrado con este correo electrónico',
      );
    }
  }

  private handlePrismaError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Ya existe un socio registrado con este correo electrónico',
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('Socio no encontrado');
    }
  }

  private mapPartner(partner: PartnerWithCount) {
    const { _count, ...data } = partner;

    return {
      ...data,
      totalLeads: _count.leads,
    };
  }
}
