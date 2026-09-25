import type { INestApplication } from '@nestjs/common';
import { OriginCheckedIoAdapter } from './origin-checked-io.adapter';
import { originCheckMiddleware, type OriginPolicy } from './request-origin';
import { createHttpValidationPipe } from './validation';

/**
 * Everything main.ts applies before listen(), kept here so a test can boot the same wiring.
 * Order matters: the origin check runs before CORS so a foreign preflight is refused too,
 * and the socket.io adapter must be set before listen() or Nest silently keeps its default.
 */
export function configureApp(app: INestApplication, policy: OriginPolicy): void {
  app.use(originCheckMiddleware(policy));
  app.enableCors({ origin: policy.webOrigin });
  app.useWebSocketAdapter(new OriginCheckedIoAdapter(app, policy));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createHttpValidationPipe());
}
