import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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
    const count = await this.prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (count !== roleIds.length) {
      throw new BadRequestException('Uno o más roles no existen');
    }
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
}
