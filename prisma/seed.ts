import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';

import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL es obligatoria');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  // ===========================================================================
  // Permisos
  // ===========================================================================

  const permissionDefinitions = [
    ['*', 'Acceso administrativo completo'],

    ['users.read', 'Consultar usuarios'],
    ['users.create', 'Crear usuarios'],
    ['users.update', 'Activar o desactivar usuarios'],
    ['users.assign_roles', 'Asignar roles a usuarios'],

    ['roles.read', 'Consultar roles'],
    ['roles.create', 'Crear roles'],
    ['roles.update', 'Actualizar roles'],
    ['roles.delete', 'Eliminar roles'],
    ['roles.assign_permissions', 'Asignar permisos a roles'],

    ['permissions.read', 'Consultar permisos'],
    ['permissions.create', 'Crear permisos'],
    ['permissions.update', 'Actualizar permisos'],
    ['permissions.delete', 'Eliminar permisos'],

    ['menus.read', 'Consultar menús'],
    ['menus.create', 'Crear menús'],
    ['menus.update', 'Actualizar menús'],
    ['menus.delete', 'Eliminar menús'],

    ['contact_messages.read', 'Consultar mensajes de contacto'],
    ['contact_messages.update', 'Marcar mensajes de contacto como leídos'],

    ['analytics.read', 'Consultar métricas del sitio'],

    ['server.overview.read', 'Consultar el estado general del servidor'],
    ['server.containers.read', 'Consultar contenedores y métricas de Docker'],
    ['server.containers.logs', 'Consultar logs recientes de contenedores'],
    [
      'server.directories.read',
      'Consultar directorios operativos del servidor',
    ],
  ] as const;

  const permissions = new Map<string, string>();

  for (const [key, description] of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {
        description,
      },
      create: {
        key,
        description,
      },
    });

    permissions.set(key, permission.id);
  }

  // ===========================================================================
  // Roles
  // ===========================================================================

  await prisma.role.upsert({
    where: {
      name: 'user',
    },
    update: {
      description: 'Usuario estándar',
    },
    create: {
      name: 'user',
      description: 'Usuario estándar',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: {
      name: 'admin',
    },
    update: {
      description: 'Administrador del sistema',
    },
    create: {
      name: 'admin',
      description: 'Administrador del sistema',
    },
  });

  // ===========================================================================
  // Permiso global para administrador
  // ===========================================================================

  const wildcardId = permissions.get('*');

  if (!wildcardId) {
    throw new Error('No fue posible crear el permiso administrativo');
  }

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: adminRole.id,
        permissionId: wildcardId,
      },
    },
    update: {},
    create: {
      roleId: adminRole.id,
      permissionId: wildcardId,
    },
  });

  // ===========================================================================
  // Menú principal de administración
  // ===========================================================================

  const administration = await prisma.menu.upsert({
    where: {
      key: 'administration',
    },
    update: {
      label: 'Administración',
      icon: 'settings',
      sortOrder: 100,
      isActive: true,
    },
    create: {
      key: 'administration',
      label: 'Administración',
      icon: 'settings',
      sortOrder: 100,
      isActive: true,
    },
  });

  // ===========================================================================
  // Menús administrativos
  // ===========================================================================

  const menuDefinitions = [
    ['users', 'Usuarios', '/admin/users', 'users', 10, 'users.read'],

    ['roles', 'Roles', '/admin/roles', 'shield', 20, 'roles.read'],

    ['menus', 'Menús', '/admin/menus', 'menu', 30, 'menus.read'],

    [
      'contact-messages',
      'Mensajes de contacto',
      '/admin/contact-messages',
      'mail',
      50,
      'contact_messages.read',
    ],

    [
      'analytics',
      'Métricas',
      '/admin/analytics',
      'chart-no-axes-combined',
      60,
      'analytics.read',
    ],

    [
      'server-overview',
      'Servidor',
      '/admin/server',
      'server',
      70,
      'server.overview.read',
    ],
  ] as const;

  for (const [
    key,
    label,
    route,
    icon,
    sortOrder,
    permissionKey,
  ] of menuDefinitions) {
    const permissionId = permissions.get(permissionKey);

    if (!permissionId) {
      throw new Error(`Permiso faltante: ${permissionKey}`);
    }

    await prisma.menu.upsert({
      where: {
        key,
      },
      update: {
        label,
        route,
        icon,
        sortOrder,
        isActive: true,
        parentId: administration.id,
        permissionId,
      },
      create: {
        key,
        label,
        route,
        icon,
        sortOrder,
        isActive: true,
        parentId: administration.id,
        permissionId,
      },
    });
  }

  // ===========================================================================
  // Idiomas
  // ===========================================================================

  const languageDefinitions = [
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      isDefault: true,
      sortOrder: 10,
    },
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      isDefault: false,
      sortOrder: 20,
    },
  ] as const;

  const languages = new Map<string, string>();

  for (const definition of languageDefinitions) {
    const language = await prisma.language.upsert({
      where: {
        code: definition.code,
      },
      update: {
        name: definition.name,
        nativeName: definition.nativeName,
        isDefault: definition.isDefault,
        isActive: true,
        sortOrder: definition.sortOrder,
      },
      create: {
        code: definition.code,
        name: definition.name,
        nativeName: definition.nativeName,
        isDefault: definition.isDefault,
        isActive: true,
        sortOrder: definition.sortOrder,
      },
    });

    languages.set(language.code, language.id);
  }

  /**
   * Por ahora Español es el idioma predeterminado.
   * Si existieran otros idiomas previamente marcados como default,
   * se desactivan como predeterminados.
   */
  await prisma.language.updateMany({
    where: {
      code: {
        not: 'es',
      },
      isDefault: true,
    },
    data: {
      isDefault: false,
    },
  });

  const spanishLanguageId = languages.get('es');
  const englishLanguageId = languages.get('en');

  if (!spanishLanguageId || !englishLanguageId) {
    throw new Error('No fue posible crear los idiomas del sistema');
  }

  // ===========================================================================
  // Opciones de desarrollo
  // ===========================================================================

  const developmentOptionDefinitions = [
    {
      code: 'WEB_DEVELOPMENT',
      sortOrder: 10,
      translations: {
        es: {
          name: 'Sitio web',
          description:
            'Desarrollo de sitios web modernos, rápidos y adaptados a las necesidades del proyecto.',
        },
        en: {
          name: 'Website',
          description:
            'Development of modern, fast websites tailored to the needs of the project.',
        },
      },
    },
    {
      code: 'MOBILE_APPLICATION',
      sortOrder: 20,
      translations: {
        es: {
          name: 'Aplicación móvil',
          description:
            'Desarrollo de aplicaciones móviles para ofrecer servicios y experiencias desde dispositivos móviles.',
        },
        en: {
          name: 'Mobile application',
          description:
            'Development of mobile applications to deliver services and experiences on mobile devices.',
        },
      },
    },
    {
      code: 'ADMIN_SYSTEM',
      sortOrder: 30,
      translations: {
        es: {
          name: 'Sistema administrativo',
          description:
            'Sistemas para administrar procesos, información y operaciones de un negocio o proyecto.',
        },
        en: {
          name: 'Management system',
          description:
            'Systems for managing processes, information, and operations for a business or project.',
        },
      },
    },
    {
      code: 'CUSTOM_SOFTWARE',
      sortOrder: 40,
      translations: {
        es: {
          name: 'Desarrollo personalizado',
          description:
            'Software diseñado específicamente para resolver una necesidad particular.',
        },
        en: {
          name: 'Custom software',
          description:
            'Software designed specifically to solve a particular need.',
        },
      },
    },
  ] as const;

  for (const definition of developmentOptionDefinitions) {
    const developmentOption = await prisma.developmentOption.upsert({
      where: {
        code: definition.code,
      },
      update: {
        sortOrder: definition.sortOrder,
        isActive: true,
      },
      create: {
        code: definition.code,
        sortOrder: definition.sortOrder,
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // Traducción Español
    // -------------------------------------------------------------------------

    await prisma.developmentOptionTranslation.upsert({
      where: {
        developmentOptionId_languageId: {
          developmentOptionId: developmentOption.id,
          languageId: spanishLanguageId,
        },
      },
      update: {
        name: definition.translations.es.name,
        description: definition.translations.es.description,
      },
      create: {
        developmentOptionId: developmentOption.id,
        languageId: spanishLanguageId,
        name: definition.translations.es.name,
        description: definition.translations.es.description,
      },
    });

    // -------------------------------------------------------------------------
    // Traducción Inglés
    // -------------------------------------------------------------------------

    await prisma.developmentOptionTranslation.upsert({
      where: {
        developmentOptionId_languageId: {
          developmentOptionId: developmentOption.id,
          languageId: englishLanguageId,
        },
      },
      update: {
        name: definition.translations.en.name,
        description: definition.translations.en.description,
      },
      create: {
        developmentOptionId: developmentOption.id,
        languageId: englishLanguageId,
        name: definition.translations.en.name,
        description: definition.translations.en.description,
      },
    });
  }

  // ===========================================================================
  // Etapas del proyecto
  // ===========================================================================

  const projectStageDefinitions = [
    {
      code: 'IDEA',
      sortOrder: 10,
      translations: {
        es: {
          name: 'Tengo una idea',
          description:
            'La idea existe, pero todavía necesita definirse y darle forma.',
        },
        en: {
          name: 'I have an idea',
          description:
            'The idea exists but still needs to be defined and shaped.',
        },
      },
    },
    {
      code: 'DEFINING',
      sortOrder: 20,
      translations: {
        es: {
          name: 'Estoy definiendo el proyecto',
          description:
            'Ya se están definiendo las necesidades, funciones y alcance del proyecto.',
        },
        en: {
          name: 'I am defining the project',
          description:
            'The needs, features, and scope of the project are currently being defined.',
        },
      },
    },
    {
      code: 'READY_TO_START',
      sortOrder: 30,
      translations: {
        es: {
          name: 'Estoy listo para comenzar',
          description:
            'El proyecto está definido y se busca comenzar su desarrollo.',
        },
        en: {
          name: 'I am ready to start',
          description: 'The project is defined and ready to begin development.',
        },
      },
    },
    {
      code: 'EXISTING_PROJECT',
      sortOrder: 40,
      translations: {
        es: {
          name: 'Ya tengo un proyecto y quiero mejorarlo',
          description:
            'Existe una solución actualmente y se busca mejorarla, ampliarla o modernizarla.',
        },
        en: {
          name: 'I have an existing project to improve',
          description:
            'An existing solution needs to be improved, expanded, or modernized.',
        },
      },
    },
  ] as const;

  for (const definition of projectStageDefinitions) {
    const projectStage = await prisma.projectStage.upsert({
      where: {
        code: definition.code,
      },
      update: {
        sortOrder: definition.sortOrder,
        isActive: true,
      },
      create: {
        code: definition.code,
        sortOrder: definition.sortOrder,
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // Traducción Español
    // -------------------------------------------------------------------------

    await prisma.projectStageTranslation.upsert({
      where: {
        projectStageId_languageId: {
          projectStageId: projectStage.id,
          languageId: spanishLanguageId,
        },
      },
      update: {
        name: definition.translations.es.name,
        description: definition.translations.es.description,
      },
      create: {
        projectStageId: projectStage.id,
        languageId: spanishLanguageId,
        name: definition.translations.es.name,
        description: definition.translations.es.description,
      },
    });

    // -------------------------------------------------------------------------
    // Traducción Inglés
    // -------------------------------------------------------------------------

    await prisma.projectStageTranslation.upsert({
      where: {
        projectStageId_languageId: {
          projectStageId: projectStage.id,
          languageId: englishLanguageId,
        },
      },
      update: {
        name: definition.translations.en.name,
        description: definition.translations.en.description,
      },
      create: {
        projectStageId: projectStage.id,
        languageId: englishLanguageId,
        name: definition.translations.en.name,
        description: definition.translations.en.description,
      },
    });
  }

  // ===========================================================================
  // Usuario administrador inicial
  // ===========================================================================

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  /**
   * Los catálogos anteriores deben crearse aunque no existan
   * credenciales administrativas configuradas.
   */
  if (!email || !password) {
    return;
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres');
  }

  const admin = await prisma.user.upsert({
    where: {
      email,
    },
    update: {},
    create: {
      email,
      passwordHash: await hash(password, { type: 2 }),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
