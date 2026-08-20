import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { UsersService } from '../users/users.service';

interface AccessTokenPayload {
  sub: string;
  email: string;
  exp: number;
}

export interface ContactMessageNotification {
  id: string;
  createdAt: string;
}

export interface ContactNotificationUpdated {
  newCount: number;
}

const AUTHENTICATED_ROOM = 'authenticated';

@WebSocketGateway({
  namespace: '/notifications',
  transports: ['websocket'],
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Namespace;

  private readonly expirationTimers = new Map<string, NodeJS.Timeout>();
  private readonly allowedOrigins: Set<string>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    this.allowedOrigins = new Set(
      (
        configService.get<string>('CORS_ALLOWED_ORIGINS') ??
        configService.getOrThrow<string>('FRONTEND_URL')
      )
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      if (!this.isAllowedOrigin(client.handshake.headers.origin)) {
        client.disconnect(true);
        return;
      }

      const token = this.readToken(client);
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      const user = await this.usersService.findByIdForAuthentication(
        payload.sub,
      );
      if (!user?.isActive) {
        client.disconnect(true);
        return;
      }

      await client.join(AUTHENTICATED_ROOM);
      const expiresInMs = payload.exp * 1000 - Date.now();
      if (expiresInMs <= 0) {
        client.disconnect(true);
        return;
      }
      this.expirationTimers.set(
        client.id,
        setTimeout(() => client.disconnect(true), expiresInMs),
      );
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const timer = this.expirationTimers.get(client.id);
    if (timer) clearTimeout(timer);
    this.expirationTimers.delete(client.id);
  }

  emitContactMessageCreated(notification: ContactMessageNotification): void {
    this.server
      .to(AUTHENTICATED_ROOM)
      .emit('contact-message.created', notification);
  }

  emitContactNotificationUpdated(
    notification: ContactNotificationUpdated,
  ): void {
    this.server
      .to(AUTHENTICATED_ROOM)
      .emit('contact-message.notification-updated', notification);
  }

  private readToken(client: Socket): string {
    const value = client.handshake.auth?.token as unknown;
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('Token requerido');
    }
    return value.startsWith('Bearer ') ? value.slice(7) : value;
  }

  private isAllowedOrigin(origin?: string): boolean {
    return !origin || this.allowedOrigins.has(origin);
  }
}
