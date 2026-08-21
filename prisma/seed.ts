import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL es obligatoria');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
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
  ] as const;
  const permissions = new Map<string, string>();
  for (const [key, description] of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
    permissions.set(key, permission.id);
  }
  await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user', description: 'Usuario estándar' },
  });
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Administrador del sistema' },
  });

  const wildcardId = permissions.get('*');
  if (!wildcardId)
    throw new Error('No fue posible crear el permiso administrativo');
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: { roleId: adminRole.id, permissionId: wildcardId },
    },
    update: {},
    create: { roleId: adminRole.id, permissionId: wildcardId },
  });

  const administration = await prisma.menu.upsert({
    where: { key: 'administration' },
    update: { label: 'Administración', icon: 'settings', sortOrder: 100 },
    create: {
      key: 'administration',
      label: 'Administración',
      icon: 'settings',
      sortOrder: 100,
    },
  });
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
    if (!permissionId) throw new Error(`Permiso faltante: ${permissionKey}`);
    await prisma.menu.upsert({
      where: { key },
      update: {
        label,
        route,
        icon,
        sortOrder,
        parentId: administration.id,
        permissionId,
      },
      create: {
        key,
        label,
        route,
        icon,
        sortOrder,
        parentId: administration.id,
        permissionId,
      },
    });
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres');
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await hash(password, { type: 2 }) },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
