import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthOauthCodeService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly ttlSeconds = 60;
  private readonly keyPrefix = 'oauth:code:';

  constructor(private readonly configService: ConfigService) {
    const url =
      this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.redis = new Redis(url, {
      ...(url.startsWith('rediss://')
        ? { tls: { rejectUnauthorized: false } }
        : {}),
    });
  }

  async createCode(accessToken: string): Promise<string> {
    const code = randomUUID();
    await this.redis.setex(
      `${this.keyPrefix}${code}`,
      this.ttlSeconds,
      accessToken,
    );
    return code;
  }

  async exchangeCode(code: string): Promise<string | null> {
    const key = `${this.keyPrefix}${code}`;
    const token = await this.redis.get(key);
    if (token) {
      await this.redis.del(key);
    }
    return token;
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
