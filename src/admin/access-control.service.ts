import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  CreatePermissionDto,
  UpdatePermissionDto,
} from './dto/create-permission.dto';
import type { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  findPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }

  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({
      where: { key: dto.key },
    });
    if (existing) throw new ConflictException('El permiso ya existe');
    return this.prisma.permission.create({ data: dto });
  }

  async updatePermission(id: string, dto: UpdatePermissionDto) {
    await this.requirePermission(id);
    return this.prisma.permission.update({ where: { id }, data: dto });
  }

  async deletePermission(id: string): Promise<void> {
    const permission = await this.requirePermission(id);
    if (permission.key === '*') {
      throw new BadRequestException(
        'El permiso administrativo no puede eliminarse',
      );
    }
    await this.prisma.permission.delete({ where: { id } });
  }

  findRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          select: { permission: true },
          orderBy: { permission: { key: 'asc' } },
        },
      },
    });
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('El rol ya existe');
    return this.prisma.role.create({ data: dto });
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    await this.requireRole(id);
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.requireRole(id);
    if (['admin', 'user'].includes(role.name)) {
      throw new BadRequestException('El rol base no puede eliminarse');
    }
    await this.prisma.role.delete({ where: { id } });
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    const role = await this.requireRole(roleId);
    if (role.name === 'admin') {
      throw new BadRequestException(
        'Los permisos del rol administrador no pueden reemplazarse',
      );
    }
    const count = await this.prisma.permission.count({
      where: { id: { in: permissionIds } },
    });
    if (count !== permissionIds.length) {
      throw new BadRequestException('Uno o más permisos no existen');
    }
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      }),
    ]);
    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { select: { permission: true } } },
    });
  }

  private async requireRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  private async requirePermission(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) throw new NotFoundException('Permiso no encontrado');
    return permission;
  }
}
