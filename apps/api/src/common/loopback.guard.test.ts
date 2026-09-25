import 'reflect-metadata';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { RunsController } from '../projects/runs.controller';
import { LoopbackOnlyGuard } from './loopback.guard';

const contextFrom = (remoteAddress: string | undefined) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ socket: { remoteAddress } }) }),
  }) as unknown as ExecutionContext;

describe('LoopbackOnlyGuard', () => {
  const guard = new LoopbackOnlyGuard();

  it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])('allows %s', (address) => {
    expect(guard.canActivate(contextFrom(address))).toBe(true);
  });

  it.each(['192.168.1.20', '10.0.0.5', '::ffff:192.168.1.20', undefined])(
    'refuses %s',
    (address) => {
      expect(() => guard.canActivate(contextFrom(address))).toThrow(ForbiddenException);
    },
  );

  it('guards the route that spawns the local codex process', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, RunsController.prototype.executeRun);
    expect(guards).toEqual(expect.arrayContaining([LoopbackOnlyGuard]));
  });
});
