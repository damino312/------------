import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ENV_CONFIG } from '../../config/configuration.js';
import type { EnvConfig } from '../../config/env.schema.js';

@Injectable()
export class ProxyAuthService {
  constructor(@Inject(ENV_CONFIG) private readonly env: EnvConfig) {}

  validate(authorization?: string): void {
    if (!this.env.PROXY_API_KEY) {
      return;
    }

    const token = authorization?.replace(/^Bearer\s+/i, '');

    if (!token || token !== this.env.PROXY_API_KEY) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
  }
}
