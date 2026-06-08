import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { LocalCodexRunner } from './local-codex-runner';
import type { LocalCodexRunnerInput } from './local-codex-runner';

// ─── Mock spawn helpers ───────────────────────────────────────────────────────

class MockChildProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;

  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
  }

  kill(): boolean {
    this.emit('close', null, 'SIGTERM');
    return true;
  }
}

function mockSpawnSuccess(
  outputLines: string[],
  exitCode = 0,
): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation((_cmd, _args, _opts) => {
    const child = new MockChildProcess();
    setImmediate(() => {
      for (const line of outputLines) {
        child.stdout.emit('data', Buffer.from(line + '\n'));
      }
      child.emit('close', exitCode);
    });
    return child as any;
  });
}

function mockSpawnError(errMsg: string): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation(() => {
    const child = new MockChildProcess();
    setImmediate(() => {
      child.emit('error', new Error(errMsg));
    });
    return child as any;
  });
}

function mockSpawnThrow(): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation(() => {
    throw new Error('spawn ENOENT');
  });
}

// ─── Env helpers ──────────────────────────────────────────────────────────────

function enableGates() {
  vi.stubEnv('ENABLE_LOCAL_CODEX', 'true');
  vi.stubEnv('ALLOW_LOCAL_PROCESS_EXECUTION', 'true');
  vi.stubEnv('NODE_ENV', 'development');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

const safeInput: LocalCodexRunnerInput = {
  prompt: 'Review the code',
  cwd: '/tmp/test-project',
};

// ─── Env gates ────────────────────────────────────────────────────────────────

describe('LocalCodexRunner — env gates', () => {
  const runner = new LocalCodexRunner(mockSpawnSuccess([]));

  it('refuses when ENABLE_LOCAL_CODEX is missing', async () => {
    vi.stubEnv('ALLOW_LOCAL_PROCESS_EXECUTION', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    const result = await runner.run(safeInput);
    expect(result.ok).toBe(false);
    expect(result.errorSummary).toContain('ENABLE_LOCAL_CODEX');
  });

  it('refuses when ALLOW_LOCAL_PROCESS_EXECUTION is missing', async () => {
    vi.stubEnv('ENABLE_LOCAL_CODEX', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    const result = await runner.run(safeInput);
    expect(result.ok).toBe(false);
    expect(result.errorSummary).toContain('ALLOW_LOCAL_PROCESS_EXECUTION');
  });

  it('refuses when NODE_ENV is production', async () => {
    vi.stubEnv('ENABLE_LOCAL_CODEX', 'true');
    vi.stubEnv('ALLOW_LOCAL_PROCESS_EXECUTION', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    const result = await runner.run(safeInput);
    expect(result.ok).toBe(false);
    expect(result.errorSummary).toContain('production');
  });
});

// ─── Spawn safety ─────────────────────────────────────────────────────────────

describe('LocalCodexRunner — spawn safety', () => {
  beforeEach(() => enableGates());

  it('uses command exactly codex', async () => {
    const spawnFn = mockSpawnSuccess([]);
    const runner = new LocalCodexRunner(spawnFn);
    await runner.run(safeInput);
    expect(spawnFn).toHaveBeenCalledTimes(1);
    expect(spawnFn.mock.calls[0][0]).toBe('codex');
  });

  it('uses args array, not shell string', async () => {
    const spawnFn = mockSpawnSuccess([]);
    const runner = new LocalCodexRunner(spawnFn);
    await runner.run(safeInput);
    const args = spawnFn.mock.calls[0][1] as string[];
    expect(Array.isArray(args)).toBe(true);
    expect(args).toContain('exec');
    expect(args).toContain('--json');
  });

  it('includes exec, --json, --sandbox, --cd in args', async () => {
    const spawnFn = mockSpawnSuccess([]);
    const runner = new LocalCodexRunner(spawnFn);
    await runner.run(safeInput);
    const args = spawnFn.mock.calls[0][1] as string[];
    expect(args).toContain('exec');
    expect(args).toContain('--json');
    expect(args).toContain('--sandbox');
    expect(args).toContain('--cd');
  });

  it('sets shell: false', async () => {
    const spawnFn = mockSpawnSuccess([]);
    const runner = new LocalCodexRunner(spawnFn);
    await runner.run(safeInput);
    const opts = spawnFn.mock.calls[0][2];
    expect(opts.shell).toBe(false);
  });

  it('defaults sandbox to read-only', async () => {
    const spawnFn = mockSpawnSuccess([]);
    const runner = new LocalCodexRunner(spawnFn);
    await runner.run(safeInput);
    const args = spawnFn.mock.calls[0][1] as string[];
    const sandboxIdx = args.indexOf('--sandbox');
    expect(args[sandboxIdx + 1]).toBe('read-only');
  });

  it('supports workspace-write sandbox', async () => {
    const spawnFn = mockSpawnSuccess([]);
    const runner = new LocalCodexRunner(spawnFn);
    await runner.run({ ...safeInput, sandbox: 'workspace-write' });
    const args = spawnFn.mock.calls[0][1] as string[];
    const sandboxIdx = args.indexOf('--sandbox');
    expect(args[sandboxIdx + 1]).toBe('workspace-write');
  });

  it('rejects danger-full-access sandbox', async () => {
    const runner = new LocalCodexRunner(mockSpawnSuccess([]));
    const result = await runner.run({
      ...safeInput,
      sandbox: 'danger-full-access' as any,
    });
    expect(result.ok).toBe(false);
    expect(result.errorSummary).toContain('danger-full-access');
  });
});

// ─── CWD validation ───────────────────────────────────────────────────────────

describe('LocalCodexRunner — cwd validation', () => {
  beforeEach(() => enableGates());

  it('rejects empty cwd', async () => {
    const runner = new LocalCodexRunner(mockSpawnSuccess([]));
    const result = await runner.run({ ...safeInput, cwd: '' });
    expect(result.ok).toBe(false);
    expect(result.errorSummary).toContain('cwd');
  });

  it('rejects filesystem root cwd', async () => {
    const runner = new LocalCodexRunner(mockSpawnSuccess([]));
    const result = await runner.run({ ...safeInput, cwd: '/' });
    expect(result.ok).toBe(false);
  });

  it('rejects cwd with null byte', async () => {
    const runner = new LocalCodexRunner(mockSpawnSuccess([]));
    const result = await runner.run({ ...safeInput, cwd: '/tmp/\0evil' });
    expect(result.ok).toBe(false);
  });
});

// ─── JSONL parsing ────────────────────────────────────────────────────────────

describe('LocalCodexRunner — JSONL parsing', () => {
  beforeEach(() => enableGates());

  it('returns parsed final message on mocked success', async () => {
    const spawnFn = mockSpawnSuccess([
      JSON.stringify({ type: 'assistant', message: { content: [{ text: 'Review complete' }] } }),
    ]);
    const runner = new LocalCodexRunner(spawnFn);
    const result = await runner.run(safeInput);
    expect(result.ok).toBe(true);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('parses multiple JSONL events', async () => {
    const spawnFn = mockSpawnSuccess([
      JSON.stringify({ type: 'system', message: 'Starting...' }),
      JSON.stringify({ type: 'tool_use', tool: 'Read', status: 'done' }),
      JSON.stringify({ type: 'assistant', message: 'Done.' }),
    ]);
    const runner = new LocalCodexRunner(spawnFn);
    const result = await runner.run(safeInput);
    expect(result.ok).toBe(true);
    expect(result.events.length).toBe(3);
  });

  it('handles invalid JSONL line safely', async () => {
    const spawnFn = mockSpawnSuccess([
      JSON.stringify({ type: 'valid', message: 'ok' }),
      'not json at all',
      '{incomplete',
      JSON.stringify({ type: 'also-valid', message: 'after bad' }),
    ]);
    const runner = new LocalCodexRunner(spawnFn);
    const result = await runner.run(safeInput);
    expect(result.ok).toBe(true);
    expect(result.events.length).toBeGreaterThanOrEqual(2);
    expect(result.events.some((e) => e.type === 'raw')).toBe(true);
  });

  it('returns error on non-zero exit', async () => {
    const spawnFn = mockSpawnSuccess(
      [JSON.stringify({ type: 'error', message: 'failed' })],
      1,
    );
    const runner = new LocalCodexRunner(spawnFn);
    const result = await runner.run(safeInput);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('handles spawn error', async () => {
    const spawnFn = mockSpawnError('ECONNREFUSED');
    const runner = new LocalCodexRunner(spawnFn);
    const result = await runner.run(safeInput);
    expect(result.ok).toBe(false);
    expect(result.errorSummary).toContain('ECONNREFUSED');
  });

  it('handles spawn throw', async () => {
    const spawnFn = mockSpawnThrow();
    const runner = new LocalCodexRunner(spawnFn);
    const result = await runner.run(safeInput);
    expect(result.ok).toBe(false);
    expect(result.errorSummary).toContain('ENOENT');
  });
});

// ─── Timeout ──────────────────────────────────────────────────────────────────

describe('LocalCodexRunner — timeout', () => {
  beforeEach(() => enableGates());

  it('times out and kills child', async () => {
    let killed = false;
    const spawnFn = vi.fn().mockImplementation((_cmd, _args, _opts) => {
      const child = new MockChildProcess();
      child.kill = () => {
        killed = true;
        child.emit('close', null, 'SIGTERM');
        return true;
      };
      return child;
    });
    const runner = new LocalCodexRunner(spawnFn);
    const result = await runner.run({ ...safeInput, timeoutMs: 50 });
    expect(killed).toBe(true);
    expect(result.timedOut).toBe(true);
  });
});

// ─── Truncation ───────────────────────────────────────────────────────────────

describe('LocalCodexRunner — truncation', () => {
  beforeEach(() => enableGates());

  it('marks oversized output as truncated', async () => {
    const bigLine = 'x'.repeat(5000);
    const lines = Array.from({ length: 100 }, () => bigLine);
    const spawnFn = mockSpawnSuccess(lines);
    const runner = new LocalCodexRunner(spawnFn);
    const result = await runner.run({ ...safeInput, maxOutputBytes: 1000 });
    expect(result.truncated).toBe(true);
  });
});
