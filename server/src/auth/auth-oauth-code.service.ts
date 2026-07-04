import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { redisConfiguration } from '../common/config/redis.config';

@Injectable()
export class AuthOauthCodeService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly ttlSeconds = 60;
  private readonly keyPrefix = 'oauth:code:';

  constructor(
    @Inject(redisConfiguration.KEY)
    redisConfig: ConfigType<typeof redisConfiguration>,
  ) {
    this.redis = new Redis(redisConfig.url, {
      ...(redisConfig.useTls ? { tls: { rejectUnauthorized: false } } : {}),
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
