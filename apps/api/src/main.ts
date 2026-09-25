import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './common/configure-app';
import { isLoopbackBindHost, originPolicyFromEnv } from './common/request-origin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Loopback by default: the API has no auth. Set HOST (e.g. 0.0.0.0) to expose it on purpose.
  const host = process.env.HOST ?? '127.0.0.1';
  configureApp(app, originPolicyFromEnv(process.env, await isLoopbackBindHost(host)));
  const port = process.env.PORT ?? 3001;
  await app.listen(port, host);
  console.log(`API running on http://${host}:${port}`);
}
bootstrap();
