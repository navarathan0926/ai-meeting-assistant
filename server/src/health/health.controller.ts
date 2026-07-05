import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigType } from '@nestjs/config';
import { appConfiguration } from '../common/config/app.config';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(appConfiguration.KEY)
    private readonly appConfig: ConfigType<typeof appConfiguration>,
  ) {}

  @Get()
  check() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: this.appConfig.nodeEnv,
    };
  }
}
