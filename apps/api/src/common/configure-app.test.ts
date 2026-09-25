import 'reflect-metadata';
import { Controller, Get, Module, Post, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WebSocketGateway } from '@nestjs/websockets';
import { request as httpRequest, type OutgoingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configureApp } from './configure-app';

@Controller('ping')
class PingController {
  @Get() read() {
    return { ok: true };
  }

  @Post() write() {
    return { ok: true };
  }
}

// Mirrors the real gateways, which pass the raw WEB_ORIGIN as their CORS origin.
@WebSocketGateway({ cors: { origin: 'HTTP://LOCALHOST:3000/' } })
class PingGateway {}

@Module({ controllers: [PingController], providers: [PingGateway] })
class PingModule {}

const WEB = 'http://localhost:3000';

/** node:http, because fetch will not let a test set Origin/Host exactly as a browser would. */
function send(port: number, method: string, path: string, headers: OutgoingHttpHeaders = {}) {
  return new Promise<{ status: number; headers: Record<string, unknown>; body: string }>(
    (resolve, reject) => {
      const req = httpRequest({ host: '127.0.0.1', port, method, path, headers }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      });
      req.on('error', reject);
      req.end();
    },
  );
}

describe('configureApp wiring (a real Nest app on a real port)', () => {
  let app: INestApplication;
  let port: number;
  const localHost = () => ({ host: `localhost:${port}` });

  beforeAll(async () => {
    app = await NestFactory.create(PingModule, { logger: false });
    configureApp(app, { webOrigin: WEB, enforceLoopbackHost: true });
    await app.listen(0, '127.0.0.1');
    port = (app.getHttpServer().address() as AddressInfo).port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets the web app and non-browser clients through', async () => {
    expect((await send(port, 'POST', '/api/ping', { ...localHost(), origin: WEB })).status).toBe(
      201,
    );
    expect((await send(port, 'GET', '/api/ping', localHost())).status).toBe(200);
  });

  it('refuses a foreign origin before any route or CORS handling runs', async () => {
    const res = await send(port, 'POST', '/api/ping', {
      ...localHost(),
      origin: 'http://evil.example',
    });
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toMatchObject({
      message: "Origin 'http://evil.example' is not allowed",
    });

    const preflight = await send(port, 'OPTIONS', '/api/ping', {
      ...localHost(),
      origin: 'http://evil.example',
      'access-control-request-method': 'POST',
    });
    expect(preflight.status).toBe(403);
  });

  it('answers the web app preflight with CORS', async () => {
    const preflight = await send(port, 'OPTIONS', '/api/ping', {
      ...localHost(),
      origin: WEB,
      'access-control-request-method': 'POST',
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(WEB);
  });

  it('refuses a DNS-rebinding Host', async () => {
    const res = await send(port, 'GET', '/api/ping', {
      host: `evil.example:${port}`,
      'sec-fetch-site': 'same-origin',
    });
    expect(res.status).toBe(403);
  });

  it('applies the same check to socket.io handshakes, with normalized CORS', async () => {
    const handshake = '/socket.io/?EIO=4&transport=polling';
    const foreign = await send(port, 'GET', handshake, {
      ...localHost(),
      origin: 'http://evil.example',
    });
    expect(foreign.status).toBe(403);

    const allowed = await send(port, 'GET', handshake, { ...localHost(), origin: WEB });
    expect(allowed.status).toBe(200);
    expect(allowed.body).toContain('"sid"');
    expect(allowed.headers['access-control-allow-origin']).toBe(WEB);
  });
});
