import { Logger } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { BlockList } from 'node:net';

export const DEFAULT_WEB_ORIGIN = 'http://localhost:3000';

const LOOPBACK_RANGES = new BlockList();
LOOPBACK_RANGES.addSubnet('127.0.0.0', 8, 'ipv4');
LOOPBACK_RANGES.addAddress('::1', 'ipv6');
LOOPBACK_RANGES.addSubnet('::ffff:127.0.0.0', 104, 'ipv6');
// Origin-less browser requests are only trusted from the API's own origin or the address bar.
// 'same-site' is excluded: it also covers pages served from other localhost ports.
const TRUSTED_FETCH_SITES = new Set(['same-origin', 'none']);
// URL.hostname lowercases and keeps IPv6 brackets. 'localhost.' is deliberately not listed.
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export interface OriginPolicy {
  /** The one browser origin allowed to call the API (serialized like the Origin header). */
  webOrigin: string;
  /** Only loopback Host names are accepted; defeats DNS rebinding while bound to loopback. */
  enforceLoopbackHost: boolean;
}

const logger = new Logger('RequestOrigin');

export function originPolicyFromEnv(env: NodeJS.ProcessEnv, bindIsLoopback: boolean): OriginPolicy {
  return {
    webOrigin: parseWebOrigin(env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN),
    enforceLoopbackHost: bindIsLoopback,
  };
}

/**
 * Resolves the listen host the way listen() does, so any spelling of loopback (127.1,
 * LOCALHOST, the long IPv6 form) keeps the Host check on; wildcards and LAN addresses do not.
 */
export async function isLoopbackBindHost(host: string): Promise<boolean> {
  const { address, family } = await lookup(host);
  return LOOPBACK_RANGES.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

function parseWebOrigin(configured: string): string {
  let url: URL | undefined;
  try {
    url = new URL(configured);
  } catch {
    url = undefined;
  }
  // A scheme-less value like 'localhost:3000' parses to the opaque origin 'null', which would
  // refuse the real web app and admit sandboxed-iframe attackers that send Origin: null.
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new Error(`WEB_ORIGIN must be an http(s) URL such as ${DEFAULT_WEB_ORIGIN}`);
  }
  return url.origin;
}

/**
 * The API has no auth, so this is what keeps other websites out of it. Browsers always send
 * Origin on cross-origin, non-GET/HEAD and WebSocket requests, and page script cannot forge
 * it, Sec-Fetch-Site or Host. Returns why the request is refused, or null to let it through.
 * Requests with neither Origin nor Sec-Fetch-Site are non-browser clients (curl, Node, the
 * Next server) and are allowed.
 */
export function checkRequestSource(
  headers: IncomingHttpHeaders,
  policy: OriginPolicy,
): string | null {
  const { origin } = headers;
  if (origin !== undefined) {
    // 'null' is a mismatch, not an absence: attackers can make a browser send it.
    if (origin !== policy.webOrigin) return `Origin '${origin}' is not allowed`;
  } else {
    const site = headers['sec-fetch-site'];
    if (site !== undefined && !TRUSTED_FETCH_SITES.has(String(site))) {
      return `${capitalize(String(site))} requests without an Origin are not allowed`;
    }
  }

  if (policy.enforceLoopbackHost && !isLoopbackHost(headers.host)) {
    return `Host '${headers.host ?? ''}' is not allowed`;
  }
  return null;
}

/** Express/Nest middleware. socket.io traffic never reaches it; see OriginCheckedIoAdapter. */
export function originCheckMiddleware(policy: OriginPolicy) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const reason = checkRequestSource(req.headers, policy);
    if (reason === null) return next();

    logger.warn(`Refused ${req.method ?? ''} ${req.url ?? ''}: ${reason}`);
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ statusCode: 403, error: 'Forbidden', message: reason }));
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isLoopbackHost(host: string | undefined): boolean {
  if (!host) return false;
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}
