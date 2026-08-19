import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ApiMessages } from '../common/messages/api.messages';

interface TurnstileResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

@Injectable()
export class TurnstileService {
  constructor(private readonly config: ConfigService) {}

  async verify(token: string | undefined, remoteIp?: string): Promise<void> {
    if (!this.config.get<boolean>('TURNSTILE_ENABLED')) return;
    if (!token) throw new BadRequestException(ApiMessages.contact.botRejected);

    const body = new URLSearchParams({
      secret: this.config.getOrThrow<string>('TURNSTILE_SECRET_KEY'),
      response: token,
      idempotency_key: randomUUID(),
    });
    if (remoteIp) body.set('remoteip', remoteIp);

    let result: TurnstileResponse;
    try {
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!response.ok) throw new Error(`Turnstile HTTP ${response.status}`);
      result = (await response.json()) as TurnstileResponse;
    } catch {
      throw new ServiceUnavailableException(
        ApiMessages.contact.verificationUnavailable,
      );
    }

    const expectedHostname = this.config.get<string>(
      'TURNSTILE_EXPECTED_HOSTNAME',
    );
    const expectedAction = this.config.getOrThrow<string>(
      'TURNSTILE_EXPECTED_ACTION',
    );
    if (
      !result.success ||
      (expectedHostname && result.hostname !== expectedHostname) ||
      result.action !== expectedAction
    ) {
      throw new BadRequestException(ApiMessages.contact.botRejected);
    }
  }
}
