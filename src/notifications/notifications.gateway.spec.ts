import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  const verifyAsync = jest.fn();
  const findByIdForAuthentication = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: { verifyAsync } },
        {
          provide: UsersService,
          useValue: { findByIdForAuthentication },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue('http://localhost:4321,http://localhost:5173'),
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();
    gateway = module.get(NotificationsGateway);
  });

  it('joins an authenticated active user to the notification room', async () => {
    verifyAsync.mockResolvedValue({
      sub: 'user-id',
      email: 'user@maycloud.com',
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    findByIdForAuthentication.mockResolvedValue({
      id: 'user-id',
      isActive: true,
    });
    const client = createClient();

    await gateway.handleConnection(client.socket);

    expect(client.join).toHaveBeenCalledWith('authenticated');
    expect(client.disconnect).not.toHaveBeenCalled();
    gateway.handleDisconnect(client.socket);
  });

  it('disconnects clients without a valid token', async () => {
    const client = createClient({ token: undefined });

    await gateway.handleConnection(client.socket);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  function createClient(auth: { token?: string } = { token: 'access-token' }) {
    const join = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn();
    const socket = {
      id: 'socket-id',
      handshake: {
        auth,
        headers: { origin: 'http://localhost:4321' },
      },
      join,
      disconnect,
    } as unknown as Socket;
    return { socket, join, disconnect };
  }
});
