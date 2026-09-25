import { createServer, type IncomingHttpHeaders, type IncomingMessage } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Server, ServerOptions } from 'socket.io';
import { OriginCheckedIoAdapter } from './origin-checked-io.adapter';
import {
  checkRequestSource,
  isLoopbackBindHost,
  originCheckMiddleware,
  originPolicyFromEnv,
  type OriginPolicy,
} from './request-origin';

const loopback: OriginPolicy = { webOrigin: 'http://localhost:3000', enforceLoopbackHost: true };
const exposed: OriginPolicy = { ...loopback, enforceLoopbackHost: false };
const web = {
  origin: 'http://localhost:3000',
  host: 'localhost:3001',
  'sec-fetch-site': 'same-site',
};

describe('originPolicyFromEnv', () => {
  it('defaults to the local web origin', () => {
    expect(originPolicyFromEnv({}, true)).toEqual(loopback);
    expect(originPolicyFromEnv({}, false)).toEqual(exposed);
  });

  it('normalizes WEB_ORIGIN so a trailing slash or capitals still match the browser', () => {
    expect(originPolicyFromEnv({ WEB_ORIGIN: 'HTTP://LocalHost:3000/' }, true).webOrigin).toBe(
      'http://localhost:3000',
    );
  });

  // 'localhost:3000' parses with scheme 'localhost:' and an opaque origin of 'null', which
  // would refuse the real web app and let sandboxed-iframe attackers (Origin: null) in.
  it.each(['not a url', '', 'localhost:3000', 'file:///x', 'app://ui'])(
    'fails fast on WEB_ORIGIN %j',
    (value) => {
      expect(() => originPolicyFromEnv({ WEB_ORIGIN: value }, true)).toThrow(/WEB_ORIGIN/);
    },
  );
});

describe('isLoopbackBindHost', () => {
  it.each([
    '127.0.0.1',
    '127.1',
    'localhost',
    'LOCALHOST',
    'localhost.',
    '::1',
    '0:0:0:0:0:0:0:1',
    '::ffff:127.0.0.1',
  ])('treats bind host %s as loopback', async (host) => {
    await expect(isLoopbackBindHost(host)).resolves.toBe(true);
  });

  it.each(['0.0.0.0', '::', '192.168.1.20'])('treats bind host %s as exposed', async (host) => {
    await expect(isLoopbackBindHost(host)).resolves.toBe(false);
  });
});

describe('checkRequestSource', () => {
  const check = (headers: IncomingHttpHeaders, policy = loopback) =>
    checkRequestSource(headers, policy);

  it('allows the web app', () => {
    expect(check(web)).toBeNull();
  });

  it.each(['localhost:3001', '127.0.0.1:3001', '[::1]:3001', 'LOCALHOST:3001'])(
    'allows non-browser clients (no Origin) on Host %s',
    (host) => {
      expect(check({ host })).toBeNull();
    },
  );

  it.each([
    'http://evil.example',
    'null',
    'http://localhost:3000.evil.example',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
  ])('refuses Origin %s', (origin) => {
    expect(check({ ...web, origin })).toMatch(/Origin/);
  });

  it('refuses Origin-less cross-site loads (img tags, navigations, GET forms)', () => {
    expect(check({ host: 'localhost:3001', 'sec-fetch-site': 'cross-site' })).toMatch(/Cross-site/);
  });

  it.each(['same-origin', 'none'])('allows Origin-less Sec-Fetch-Site %s', (site) => {
    expect(check({ host: 'localhost:3001', 'sec-fetch-site': site })).toBeNull();
  });

  // A page on another localhost port is same-site; its img/no-cors GETs carry no Origin.
  it('refuses Origin-less same-site loads from other local ports', () => {
    expect(check({ host: 'localhost:3001', 'sec-fetch-site': 'same-site' })).toMatch(/site/);
  });

  it.each(['evil.example:3001', 'localhost.:3001', '0.0.0.0:3001', '10.0.0.5:3001'])(
    'refuses DNS-rebinding Host %s while bound to loopback',
    (host) => {
      expect(check({ host })).toMatch(/Host/);
    },
  );

  it('refuses the header set a browser sends on a DNS-rebinding GET', () => {
    expect(check({ host: 'evil.example:3001', 'sec-fetch-site': 'same-origin' })).toMatch(/Host/);
  });

  it('refuses a missing Host while bound to loopback', () => {
    expect(check({})).toMatch(/Host/);
  });

  it('accepts any Host once HOST deliberately exposes the API, but still checks Origin', () => {
    expect(check({ host: '192.168.1.20:3001' }, exposed)).toBeNull();
    expect(check({ host: '192.168.1.20:3001', origin: 'http://evil.example' }, exposed)).toMatch(
      /Origin/,
    );
  });
});

describe('originCheckMiddleware', () => {
  const response = () => {
    const res = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
    return res;
  };

  it('passes allowed requests on', () => {
    const next = vi.fn();
    const res = response();
    originCheckMiddleware(loopback)({ headers: web } as IncomingMessage, res as never, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.end).not.toHaveBeenCalled();
  });

  it('answers 403 JSON and stops the chain for refused requests', () => {
    const next = vi.fn();
    const res = response();
    originCheckMiddleware(loopback)(
      { headers: { ...web, origin: 'http://evil.example' } } as IncomingMessage,
      res as never,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(JSON.parse(res.end.mock.calls[0]![0] as string)).toMatchObject({
      statusCode: 403,
      message: "Origin 'http://evil.example' is not allowed",
    });
  });
});

describe('OriginCheckedIoAdapter', () => {
  let io: Server | undefined;
  afterEach(() => {
    io?.close();
    io = undefined;
  });

  type AllowRequest = NonNullable<ServerOptions['allowRequest']>;
  const allowRequestOf = (server: Server) =>
    (server.engine as unknown as { opts: { allowRequest: AllowRequest } }).opts.allowRequest;
  const ask = (allow: AllowRequest, headers: IncomingHttpHeaders) =>
    new Promise<{ err: unknown; ok: boolean }>((resolve) =>
      allow({ headers } as IncomingMessage, (err, ok) => resolve({ err, ok })),
    );

  it('checks every socket.io handshake on the shared HTTP server', async () => {
    const server = new OriginCheckedIoAdapter(createServer(), loopback).createIOServer(0, {});
    io = server;
    const allow = allowRequestOf(server);

    await expect(ask(allow, web)).resolves.toEqual({ err: null, ok: true });
    await expect(ask(allow, { ...web, origin: 'http://evil.example' })).resolves.toEqual({
      err: "Origin 'http://evil.example' is not allowed",
      ok: false,
    });
  });

  it("answers socket.io CORS with the normalized origin, not a gateway's raw env value", () => {
    const server = new OriginCheckedIoAdapter(createServer(), loopback).createIOServer(0, {
      cors: { origin: 'HTTP://LOCALHOST:3000/', credentials: false },
    });
    io = server;
    const opts = (server.engine as unknown as { opts: { cors: unknown } }).opts;
    expect(opts.cors).toEqual({ origin: 'http://localhost:3000', credentials: false });
  });

  it('still runs a gateway-supplied allowRequest after its own check passes', async () => {
    const inner = vi.fn((_req: IncomingMessage, cb: (err: null, ok: boolean) => void) =>
      cb(null, false),
    );
    const server = new OriginCheckedIoAdapter(createServer(), loopback).createIOServer(0, {
      allowRequest: inner,
    });
    io = server;

    await expect(ask(allowRequestOf(server), web)).resolves.toEqual({ err: null, ok: false });
    expect(inner).toHaveBeenCalledOnce();
  });
});
