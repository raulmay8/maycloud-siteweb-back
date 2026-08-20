import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'argon2';
import { PrismaService } from '../database/prisma.service';
import type { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

const userWithAuthorization = {
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailForAuthentication(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userWithAuthorization,
    });
  }

  async findByIdForAuthentication(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: userWithAuthorization,
    });
  }

  async create(input: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
  }) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('El correo ya está registrado');
    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'user' },
      select: { id: true },
    });

    return this.prisma.user.create({
      data: {
        ...input,
        email,
        roles: defaultRole ? { create: { roleId: defaultRole.id } } : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async createByAdmin(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('El correo ya está registrado');

    let roleIds = dto.roleIds;
    if (roleIds) {
      await this.validateRoleIds(roleIds);
    } else {
      const defaultRole = await this.prisma.role.findUnique({
        where: { name: 'user' },
        select: { id: true },
      });
      roleIds = defaultRole ? [defaultRole.id] : [];
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: await hash(dto.password, { type: 2 }),
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: roleIds.length
          ? { create: roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        roles: { select: { role: { select: { id: true, name: true } } } },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userWithAuthorization,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const permissions = new Map<
      string,
      {
        id: string;
        key: string;
        description: string | null;
        inheritedFrom: string[];
      }
    >();
    for (const { role } of user.roles) {
      for (const { permission } of role.permissions) {
        const current = permissions.get(permission.id);
        if (current) {
          current.inheritedFrom.push(role.name);
        } else {
          permissions.set(permission.id, {
            id: permission.id,
            key: permission.key,
            description: permission.description,
            inheritedFrom: [role.name],
          });
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map(({ role }) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
      permissions: [...permissions.values()].sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.requireUser(id);
    const email = dto.email?.toLowerCase();
    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('El correo ya está registrado');
      }
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async setActive(id: string, isActive: boolean, actorId: string) {
    if (id === actorId && !isActive) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    await this.requireUser(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  async assignRoles(userId: string, roleIds: string[], actorId: string) {
    if (userId === actorId) {
      throw new BadRequestException('No puedes reemplazar tus propios roles');
    }
    await this.requireUser(userId);
    await this.validateRoleIds(roleIds);
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      }),
    ]);
    return this.findByIdForAuthentication(userId);
  }

  private async requireUser(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
  }

  private async validateRoleIds(roleIds: string[]): Promise<void> {
    const count = await this.prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (count !== roleIds.length) {
      throw new BadRequestException('Uno o más roles no existen');
    }
  }
}
