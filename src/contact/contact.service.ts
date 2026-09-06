import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import { ContactMessageStatus } from '../generated/prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

import type { ContactCatalogQueryDto } from './dto/contact-catalog-query.dto';
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

  // ===========================================================================
  // Catálogos públicos
  // ===========================================================================

  async getCatalogs(query: ContactCatalogQueryDto) {
    const defaultLanguage = await this.prisma.language.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
        nativeName: true,
      },
    });

    if (!defaultLanguage) {
      throw new ServiceUnavailableException(
        'No hay un idioma predeterminado disponible',
      );
    }

    let requestedLanguage = defaultLanguage;

    if (query.locale) {
      const locale = query.locale.toLowerCase();

      const language = await this.prisma.language.findUnique({
        where: {
          code: locale,
        },
        select: {
          id: true,
          code: true,
          name: true,
          nativeName: true,
          isActive: true,
        },
      });

      if (!language || !language.isActive) {
        throw new BadRequestException('Idioma no disponible');
      }

      requestedLanguage = {
        id: language.id,
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
      };
    }

    const languageIds =
      requestedLanguage.id === defaultLanguage.id
        ? [defaultLanguage.id]
        : [requestedLanguage.id, defaultLanguage.id];

    const [developmentOptions, projectStages] = await this.prisma.$transaction([
      this.prisma.developmentOption.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        select: {
          id: true,
          code: true,
          translations: {
            where: {
              languageId: {
                in: languageIds,
              },
            },
            select: {
              languageId: true,
              name: true,
              description: true,
            },
          },
        },
      }),

      this.prisma.projectStage.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        select: {
          id: true,
          code: true,
          translations: {
            where: {
              languageId: {
                in: languageIds,
              },
            },
            select: {
              languageId: true,
              name: true,
              description: true,
            },
          },
        },
      }),
    ]);

    return {
      language: {
        code: requestedLanguage.code,
        name: requestedLanguage.name,
        nativeName: requestedLanguage.nativeName,
      },

      developmentOptions: developmentOptions.map((option) => {
        const translation =
          option.translations.find(
            (item) => item.languageId === requestedLanguage.id,
          ) ??
          option.translations.find(
            (item) => item.languageId === defaultLanguage.id,
          );

        return {
          id: option.id,
          code: option.code,
          name: translation?.name ?? option.code,
          description: translation?.description ?? null,
        };
      }),

      projectStages: projectStages.map((stage) => {
        const translation =
          stage.translations.find(
            (item) => item.languageId === requestedLanguage.id,
          ) ??
          stage.translations.find(
            (item) => item.languageId === defaultLanguage.id,
          );

        return {
          id: stage.id,
          code: stage.code,
          name: translation?.name ?? stage.code,
          description: translation?.description ?? null,
        };
      }),
    };
  }

  // ===========================================================================
  // Listado administrativo
  // ===========================================================================

  async findAll(query: ListContactMessagesQueryDto) {
    const skip = (query.page - 1) * query.pageSize;

    const defaultLanguage = await this.prisma.language.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
      },
    });

    if (!defaultLanguage) {
      throw new ServiceUnavailableException(
        'No hay un idioma predeterminado disponible',
      );
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          companyOrProject: true,
          email: true,
          phone: true,
          message: true,
          status: true,
          createdAt: true,
          updatedAt: true,

          projectStage: {
            select: {
              id: true,
              code: true,
              translations: {
                where: {
                  languageId: defaultLanguage.id,
                },
                select: {
                  name: true,
                  description: true,
                },
                take: 1,
              },
            },
          },

          developmentOptions: {
            select: {
              developmentOption: {
                select: {
                  id: true,
                  code: true,
                  translations: {
                    where: {
                      languageId: defaultLanguage.id,
                    },
                    select: {
                      name: true,
                      description: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      }),

      this.prisma.contactMessage.count(),
    ]);

    return {
      items: items.map((item) => {
        const projectStageTranslation =
          item.projectStage.translations[0] ?? null;

        return {
          id: item.id,
          name: item.name,
          companyOrProject: item.companyOrProject,
          email: item.email,
          phone: item.phone,
          message: item.message,
          status: item.status,

          projectStage: {
            id: item.projectStage.id,
            code: item.projectStage.code,
            name: projectStageTranslation?.name ?? item.projectStage.code,
            description: projectStageTranslation?.description ?? null,
          },

          developmentOptions: item.developmentOptions.map((relation) => {
            const option = relation.developmentOption;
            const translation = option.translations[0] ?? null;

            return {
              id: option.id,
              code: option.code,
              name: translation?.name ?? option.code,
              description: translation?.description ?? null,
            };
          }),

          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),

      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  // ===========================================================================
  // Actualización de estado
  // ===========================================================================

  async updateStatus(id: string, status: ReadableContactMessageStatus) {
    const existing = await this.prisma.contactMessage.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Mensaje de contacto no encontrado');
    }

    const message = await this.prisma.contactMessage.update({
      where: {
        id,
      },
      data: {
        status,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    const newCount = await this.prisma.contactMessage.count({
      where: {
        status: ContactMessageStatus.NEW,
      },
    });

    this.notifications.emitContactNotificationUpdated({
      newCount,
    });

    return message;
  }

  // ===========================================================================
  // Creación pública
  // ===========================================================================

  async create(dto: CreateContactMessageDto, remoteIp?: string) {
    /**
     * Honeypot.
     *
     * Fingimos que el mensaje fue recibido correctamente para no revelar
     * al bot que detectamos el campo oculto.
     */
    if (dto.website) {
      return {
        reference: randomUUID(),
      };
    }

    /**
     * La verificación externa se realiza antes de abrir una transacción
     * contra PostgreSQL.
     */
    await this.turnstile.verify(dto.turnstileToken, remoteIp);

    const contact = await this.prisma.$transaction(async (transaction) => {
      // -----------------------------------------------------------------------
      // Etapa del proyecto
      // -----------------------------------------------------------------------

      const projectStage = await transaction.projectStage.findFirst({
        where: {
          id: dto.projectStageId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!projectStage) {
        throw new BadRequestException(
          'La etapa del proyecto seleccionada no es válida',
        );
      }

      // -----------------------------------------------------------------------
      // Opciones de desarrollo
      // -----------------------------------------------------------------------

      const developmentOptions = await transaction.developmentOption.findMany({
        where: {
          id: {
            in: dto.developmentOptionIds,
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (developmentOptions.length !== dto.developmentOptionIds.length) {
        throw new BadRequestException(
          'Una o más opciones de desarrollo no son válidas',
        );
      }

      // -----------------------------------------------------------------------
      // Contacto
      // -----------------------------------------------------------------------

      return transaction.contactMessage.create({
        data: {
          name: dto.name,

          companyOrProject: dto.companyOrProject?.trim() || null,

          email: dto.email.toLowerCase(),

          phone: dto.phone?.trim() || null,

          projectStageId: projectStage.id,

          message: dto.message,

          developmentOptions: {
            create: dto.developmentOptionIds.map((developmentOptionId) => ({
              developmentOptionId,
            })),
          },
        },
        select: {
          id: true,
          createdAt: true,
        },
      });
    });

    // =========================================================================
    // Notificación
    // =========================================================================

    this.notifications.emitContactMessageCreated({
      id: contact.id,
      createdAt: contact.createdAt.toISOString(),
    });

    return {
      reference: contact.id,
    };
  }
}
