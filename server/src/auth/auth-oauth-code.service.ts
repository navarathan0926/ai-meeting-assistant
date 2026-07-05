import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT } from '../common/redis/redis.constants';

@Injectable()
export class AuthOauthCodeService {
  private readonly ttlSeconds = 60;
  private readonly keyPrefix = 'oauth:code:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

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
}
