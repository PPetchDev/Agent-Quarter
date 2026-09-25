import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { IncomingMessage } from 'node:http';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Only lets requests from this machine through. It reads the socket address, never
 * X-Forwarded-For, so a remote caller cannot spoof it. Defense in depth for routes that
 * spawn local processes, in case HOST is set to expose the API beyond loopback.
 */
@Injectable()
export class LoopbackOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<IncomingMessage>();
    if (LOOPBACK_ADDRESSES.has(request.socket.remoteAddress ?? '')) return true;
    throw new ForbiddenException('Only available from this machine');
  }
}
