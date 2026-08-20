import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from './users.service';

jest.mock('argon2', () => ({ hash: jest.fn().mockResolvedValue('hash') }));

describe('UsersService', () => {
  let service: UsersService;
  const userFindUnique = jest.fn();
  const userCreate = jest.fn();
  const userUpdate = jest.fn();
  const roleFindUnique = jest.fn();
  const roleCount = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: userFindUnique,
              create: userCreate,
              update: userUpdate,
            },
            role: { findUnique: roleFindUnique, count: roleCount },
          },
        },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('creates an administrative user with selected roles', async () => {
    userFindUnique.mockResolvedValue(null);
    roleCount.mockResolvedValue(1);
    userCreate.mockResolvedValue({ id: 'user-id' });

    await service.createByAdmin({
      email: 'ADMIN@MAYCLOUD.COM',
      password: 'Password1234',
      firstName: 'Ana',
      roleIds: ['role-id'],
    });

    expect(userCreate).toHaveBeenCalledWith({
      data: {
        email: 'admin@maycloud.com',
        passwordHash: 'hash',
        firstName: 'Ana',
        lastName: undefined,
        roles: { create: [{ roleId: 'role-id' }] },
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
  });

  it('returns roles and deduplicated effective permissions', async () => {
    const createdAt = new Date('2026-08-19T10:00:00.000Z');
    const updatedAt = new Date('2026-08-19T11:00:00.000Z');
    const permission = {
      id: 'permission-id',
      key: 'users.read',
      description: 'Consultar usuarios',
    };
    userFindUnique.mockResolvedValue({
      id: 'user-id',
      email: 'user@maycloud.com',
      passwordHash: 'must-not-be-returned',
      firstName: 'Ana',
      lastName: 'López',
      isActive: true,
      createdAt,
      updatedAt,
      roles: [
        {
          role: {
            id: 'role-1',
            name: 'editor',
            description: 'Editor',
            permissions: [{ permission }],
          },
        },
        {
          role: {
            id: 'role-2',
            name: 'auditor',
            description: 'Auditor',
            permissions: [{ permission }],
          },
        },
      ],
    });

    await expect(service.findOne('user-id')).resolves.toEqual({
      id: 'user-id',
      email: 'user@maycloud.com',
      firstName: 'Ana',
      lastName: 'López',
      isActive: true,
      createdAt,
      updatedAt,
      roles: [
        { id: 'role-1', name: 'editor', description: 'Editor' },
        { id: 'role-2', name: 'auditor', description: 'Auditor' },
      ],
      permissions: [
        {
          ...permission,
          inheritedFrom: ['editor', 'auditor'],
        },
      ],
    });
  });

  it('updates profile data without changing status or roles', async () => {
    userFindUnique
      .mockResolvedValueOnce({ id: 'user-id' })
      .mockResolvedValueOnce(null);
    userUpdate.mockResolvedValue({ id: 'user-id' });

    await service.update('user-id', {
      email: 'NEW@MAYCLOUD.COM',
      firstName: 'Ana María',
    });

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: {
        email: 'new@maycloud.com',
        firstName: 'Ana María',
        lastName: undefined,
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
  });
});
