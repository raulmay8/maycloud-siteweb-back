import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { ApiMessages } from '../messages/api.messages';

interface TurnstileResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

interface VerifyTurnstileOptions {
  token?: string;
  remoteIp?: string;
  expectedAction: string;
}

@Injectable()
export class TurnstileService {
  constructor(private readonly config: ConfigService) {}

  async verify(options: VerifyTurnstileOptions): Promise<void> {
    if (!this.config.get<boolean>('TURNSTILE_ENABLED')) return;
    if (!options.token) {
      throw new BadRequestException(ApiMessages.publicForms.botRejected);
    }

    const body = new URLSearchParams({
      secret: this.config.getOrThrow<string>('TURNSTILE_SECRET_KEY'),
      response: options.token,
      idempotency_key: randomUUID(),
    });

    if (options.remoteIp) body.set('remoteip', options.remoteIp);

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
        ApiMessages.publicForms.verificationUnavailable,
      );
    }

    const expectedHostnames = (
      this.config.get<string>('TURNSTILE_EXPECTED_HOSTNAME') ?? ''
    )
      .split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean);

    if (
      !result.success ||
      (expectedHostnames.length > 0 &&
        (!result.hostname || !expectedHostnames.includes(result.hostname))) ||
      result.action !== options.expectedAction
    ) {
      throw new BadRequestException(ApiMessages.publicForms.botRejected);
    }
  }
}
