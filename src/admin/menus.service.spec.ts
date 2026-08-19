import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { MenusService } from './menus.service';

describe('MenusService', () => {
  let service: MenusService;
  const findMany = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenusService,
        { provide: PrismaService, useValue: { menu: { findMany } } },
      ],
    }).compile();
    service = module.get(MenusService);
  });

  it('returns a hierarchical menu filtered by permissions', async () => {
    findMany.mockResolvedValue([
      {
        id: 'root',
        key: 'administration',
        label: 'Administración',
        route: null,
        icon: 'settings',
        sortOrder: 10,
        parentId: null,
        permission: null,
      },
      {
        id: 'users',
        key: 'users',
        label: 'Usuarios',
        route: '/admin/users',
        icon: 'users',
        sortOrder: 10,
        parentId: 'root',
        permission: { key: 'users.read' },
      },
      {
        id: 'roles',
        key: 'roles',
        label: 'Roles',
        route: '/admin/roles',
        icon: 'shield',
        sortOrder: 20,
        parentId: 'root',
        permission: { key: 'roles.read' },
      },
    ]);

    const navigation = await service.navigation({
      id: 'user-id',
      email: 'user@example.com',
      roles: ['editor'],
      permissions: ['users.read'],
    });
    expect(navigation).toHaveLength(1);
    expect(navigation[0]?.children.map(({ key }) => key)).toEqual(['users']);
  });
});
