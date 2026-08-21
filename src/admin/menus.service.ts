import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { PrismaService } from '../database/prisma.service';
import type { CreateMenuDto, UpdateMenuDto } from './dto/create-menu.dto';

export interface NavigationItem {
  id: string;
  key: string;
  label: string;
  route: string | null;
  icon: string | null;
  sortOrder: number;
  children: NavigationItem[];
}

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.menu.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      include: {
        permission: true,
        parent: { select: { id: true, key: true, label: true } },
        _count: { select: { children: true } },
      },
    });
  }

  async findOne(id: string) {
    await this.requireMenu(id);
    return this.prisma.menu.findUnique({
      where: { id },
      include: {
        permission: true,
        parent: { select: { id: true, key: true, label: true } },
        children: {
          select: { id: true, key: true, label: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        },
      },
    });
  }

  async create(dto: CreateMenuDto) {
    const existing = await this.prisma.menu.findUnique({
      where: { key: dto.key },
    });
    if (existing) throw new ConflictException('La opción de menú ya existe');
    await this.validateRelations(dto.parentId, dto.permissionId);
    return this.prisma.menu.create({
      data: dto,
      include: { permission: true },
    });
  }

  async update(id: string, dto: UpdateMenuDto) {
    await this.requireMenu(id);
    if (dto.key) {
      const existing = await this.prisma.menu.findFirst({
        where: { key: dto.key, id: { not: id } },
        select: { id: true },
      });
      if (existing) throw new ConflictException('La opción de menú ya existe');
    }
    if (dto.parentId === id) {
      throw new BadRequestException('Un menú no puede ser su propio padre');
    }
    await this.validateRelations(dto.parentId, dto.permissionId, id);
    return this.prisma.menu.update({
      where: { id },
      data: dto,
      include: { permission: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.requireMenu(id);
    const children = await this.prisma.menu.count({ where: { parentId: id } });
    if (children) {
      throw new BadRequestException('El menú contiene opciones hijas');
    }
    await this.prisma.menu.delete({ where: { id } });
  }

  async navigation(user: AuthenticatedUser): Promise<NavigationItem[]> {
    const menus = await this.prisma.menu.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      include: { permission: { select: { key: true } } },
    });
    const granted = new Set(user.permissions);
    const allowed = menus.filter(
      (menu) =>
        granted.has('*') ||
        !menu.permission ||
        granted.has(menu.permission.key),
    );
    const byParent = new Map<string | null, typeof allowed>();
    for (const menu of allowed) {
      const siblings = byParent.get(menu.parentId) ?? [];
      siblings.push(menu);
      byParent.set(menu.parentId, siblings);
    }
    const build = (parentId: string | null): NavigationItem[] =>
      (byParent.get(parentId) ?? []).map((menu) => ({
        id: menu.id,
        key: menu.key,
        label: menu.label,
        route: menu.route,
        icon: menu.icon,
        sortOrder: menu.sortOrder,
        children: build(menu.id),
      }));
    return build(null);
  }

  private async validateRelations(
    parentId?: string | null,
    permissionId?: string | null,
    currentId?: string,
  ) {
    if (parentId) {
      let parent = await this.requireMenu(parentId);
      while (currentId && parent.parentId) {
        if (parent.parentId === currentId) {
          throw new BadRequestException(
            'La jerarquía del menú contiene un ciclo',
          );
        }
        parent = await this.requireMenu(parent.parentId);
      }
    }
    if (permissionId) {
      const permission = await this.prisma.permission.findUnique({
        where: { id: permissionId },
        select: { id: true },
      });
      if (!permission) throw new BadRequestException('El permiso no existe');
    }
  }

  private async requireMenu(id: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('Menú no encontrado');
    return menu;
  }
}
