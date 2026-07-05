import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { appConfiguration } from '../common/config/app.config';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: appConfiguration.KEY,
          useValue: { nodeEnv: 'test' },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return healthy status with environment from config', () => {
    const result = controller.check();
    expect(result.status).toBe('healthy');
    expect(result.environment).toBe('test');
  });
});
