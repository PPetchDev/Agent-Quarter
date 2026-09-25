import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createHttpValidationPipe } from './common/validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createHttpValidationPipe());
  const port = process.env.PORT ?? 3001;
  // Loopback by default: the API has no auth. Set HOST (e.g. 0.0.0.0) to expose it on purpose.
  const host = process.env.HOST ?? '127.0.0.1';
  await app.listen(port, host);
  console.log(`API running on http://${host}:${port}`);
}
bootstrap();
