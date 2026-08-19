import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import type { SignOptions } from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await hash(dto.password, { type: 2 });
    return this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailForAuthentication(
      dto.email,
    );
    if (!user?.isActive || !(await verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.issueSession(user);
  }

  async refresh(rawToken: string) {
    const storedToken = await this.validateRefreshToken(rawToken);
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) throw new UnauthorizedException();

    const user = await this.usersService.findByIdForAuthentication(
      storedToken.userId,
    );
    if (!user?.isActive) throw new UnauthorizedException();
    return this.issueSession(user);
  }

  async logout(rawToken: string): Promise<void> {
    const storedToken = await this.validateRefreshToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueSession(
    user: NonNullable<
      Awaited<ReturnType<UsersService['findByIdForAuthentication']>>
    >,
  ) {
    const roles = user.roles.map(({ role }) => role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.key),
        ),
      ),
    ];
    const expiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as SignOptions['expiresIn'];
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      { expiresIn },
    );
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
      user: { id: user.id, email: user.email, roles, permissions },
    };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const id = randomUUID();
    const secret = randomBytes(48).toString('base64url');
    const days = this.configService.getOrThrow<number>(
      'REFRESH_TOKEN_EXPIRES_IN_DAYS',
    );
    await this.prisma.refreshToken.create({
      data: {
        id,
        userId,
        tokenHash: await hash(secret, { type: 2 }),
        expiresAt: new Date(Date.now() + days * 86_400_000),
      },
    });
    return `${id}.${secret}`;
  }

  private async validateRefreshToken(rawToken: string) {
    const separator = rawToken.indexOf('.');
    if (separator < 1) throw new UnauthorizedException();
    const id = rawToken.slice(0, separator);
    const secret = rawToken.slice(separator + 1);
    const stored = await this.prisma.refreshToken.findUnique({ where: { id } });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt <= new Date() ||
      !(await verify(stored.tokenHash, secret))
    ) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    return stored;
  }
}
