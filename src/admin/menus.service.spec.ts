import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MenusService } from './menus.service';

describe('MenusService', () => {
  let service: MenusService;
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const findFirst = jest.fn();
  const update = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenusService,
        {
          provide: PrismaService,
          useValue: { menu: { findMany, findUnique, findFirst, update } },
        },
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

  it('allows moving a menu to the root and removing its permission', async () => {
    findUnique.mockResolvedValue({
      id: '8dcc281d-2e8f-4f62-98f2-fd09ed777ce3',
      key: 'users',
      parentId: '7e7041a6-c50c-49f8-a5bb-7b9e0e02f938',
    });
    update.mockResolvedValue({ id: '8dcc281d-2e8f-4f62-98f2-fd09ed777ce3' });

    await service.update('8dcc281d-2e8f-4f62-98f2-fd09ed777ce3', {
      parentId: null,
      permissionId: null,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { parentId: null, permissionId: null },
      }),
    );
  });

  it('rejects a duplicated key when editing a menu', async () => {
    findUnique.mockResolvedValue({
      id: '8dcc281d-2e8f-4f62-98f2-fd09ed777ce3',
      key: 'users',
      parentId: null,
    });
    findFirst.mockResolvedValue({
      id: '7e7041a6-c50c-49f8-a5bb-7b9e0e02f938',
    });

    await expect(
      service.update('8dcc281d-2e8f-4f62-98f2-fd09ed777ce3', {
        key: 'roles',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });
});
