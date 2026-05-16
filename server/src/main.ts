import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── CORS ───────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Global prefix ──────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Global validation ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,       // auto-cast params (e.g. string → number)
    }),
  );

  // ── Global exception filter ────────────────────────────────────────
  // Catches all HttpExceptions and returns a consistent error shape.
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global response transform ──────────────────────────────────────
  // Wraps all successful responses in { data, statusCode, timestamp }.
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀  Server running on http://localhost:${port}/api`);
}
bootstrap();
