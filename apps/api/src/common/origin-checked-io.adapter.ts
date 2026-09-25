import { Logger, type INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server as HttpServer } from 'node:http';
import type { Server, ServerOptions } from 'socket.io';
import { checkRequestSource, type OriginPolicy } from './request-origin';

type AllowRequest = NonNullable<ServerOptions['allowRequest']>;

const logger = new Logger('OriginCheckedIoAdapter');

/**
 * Nest builds one socket.io server per port and only keeps the options of whichever gateway
 * it scans first, and engine.io handles /socket.io before any HTTP middleware runs. So the
 * origin check is attached here, where it covers every namespace's handshake, polling and
 * direct websocket upgrades alike. Register it with useWebSocketAdapter before listen().
 */
export class OriginCheckedIoAdapter extends IoAdapter {
  constructor(
    appOrHttpServer: INestApplicationContext | HttpServer,
    private readonly policy: OriginPolicy,
  ) {
    super(appOrHttpServer);
  }

  override createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    const inner = options?.allowRequest;
    const allowRequest: AllowRequest = (req, callback) => {
      const reason = checkRequestSource(req.headers, this.policy);
      if (reason !== null) {
        logger.warn(`Refused socket handshake: ${reason}`);
        return callback(reason, false);
      }
      return inner ? inner(req, callback) : callback(null, true);
    };
    // Gateways pass the raw WEB_ORIGIN; answer CORS with the same normalized origin as REST.
    const cors = { ...options?.cors, origin: this.policy.webOrigin };
    return super.createIOServer(port, { ...options, cors, allowRequest });
  }
}
