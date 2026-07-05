import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { redisConfiguration } from '../config/redis.config';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [redisConfiguration.KEY],
      useFactory: (redis: ConfigType<typeof redisConfiguration>) =>
        new Redis(redis.url, {
          ...(redis.useTls
            ? { tls: { rejectUnauthorized: redis.tlsRejectUnauthorized } }
            : {}),
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
