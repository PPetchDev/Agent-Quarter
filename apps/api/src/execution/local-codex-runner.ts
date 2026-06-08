import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CodexSandboxMode = 'read-only' | 'workspace-write';

export type LocalCodexRunnerInput = {
  prompt: string;
  cwd: string;
  sandbox?: CodexSandboxMode;
  timeoutMs?: number;
  maxOutputBytes?: number;
};

export type LocalCodexRunnerEvent = {
  type: string;
  message?: string;
  raw?: unknown;
};

export type LocalCodexRunnerResult = {
  ok: boolean;
  finalMessage?: string;
  events: LocalCodexRunnerEvent[];
  exitCode?: number | null;
  errorSummary?: string;
  timedOut?: boolean;
  truncated?: boolean;
};

// ─── Spawn abstraction ────────────────────────────────────────────────────────

type SpawnFn = (...args: any[]) => any;

// ─── Constants ────────────────────────────────────────────────────────────────

const CODE_GATES = Object.freeze([
  'ENABLE_LOCAL_CODEX',
  'ALLOW_LOCAL_PROCESS_EXECUTION',
] as const);

const VALID_SANDBOX_MODES: ReadonlySet<string> = new Set([
  'read-only',
  'workspace-write',
]);

const FORBIDDEN_SANDBOX = 'danger-full-access';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 256_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCodexArgs(
  sandbox: CodexSandboxMode,
  cwd: string,
  prompt: string,
): string[] {
  return ['exec', '--json', `--sandbox`, sandbox, `--cd`, cwd, prompt];
}

function parseJsonlLine(
  line: string,
): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return null;
  }
}

function extractMessage(obj: Record<string, unknown>): string | undefined {
  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.text === 'string') return obj.text;
  if (typeof obj.content === 'string') return obj.content;
  if (typeof obj.data === 'string') return obj.data;
  return undefined;
}

function extractEvent(obj: Record<string, unknown>): LocalCodexRunnerEvent {
  const type = typeof obj.type === 'string' ? obj.type : 'unknown';
  const message = extractMessage(obj);
  return { type, message, raw: obj };
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export class LocalCodexRunner {
  constructor(private readonly spawnImpl: SpawnFn = spawn) {}

  async run(input: LocalCodexRunnerInput): Promise<LocalCodexRunnerResult> {
    // Dev-only gates
    for (const gate of CODE_GATES) {
      if (process.env[gate] !== 'true') {
        return {
          ok: false,
          events: [],
          errorSummary: `${gate} is not enabled`,
        };
      }
    }

    if (process.env.NODE_ENV === 'production') {
      return {
        ok: false,
        events: [],
        errorSummary: 'Local execution is not allowed in production',
      };
    }

    // CWD validation
    if (!input.cwd || input.cwd.length === 0) {
      return { ok: false, events: [], errorSummary: 'cwd is empty' };
    }
    if (input.cwd === '/') {
      return { ok: false, events: [], errorSummary: 'cwd must not be filesystem root' };
    }
    if (input.cwd.includes('\0')) {
      return { ok: false, events: [], errorSummary: 'cwd contains null byte' };
    }

    // Sandbox validation
    const sandbox = (input.sandbox ?? 'read-only') as string;
    if (!VALID_SANDBOX_MODES.has(sandbox)) {
      if (sandbox === (FORBIDDEN_SANDBOX as string)) {
        return { ok: false, events: [], errorSummary: 'danger-full-access is forbidden' };
      }
      return { ok: false, events: [], errorSummary: `invalid sandbox mode: ${sandbox}` };
    }

    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxOutputBytes = input.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

    const args = buildCodexArgs(sandbox as CodexSandboxMode, input.cwd, input.prompt);

    return new Promise((resolve) => {
      const events: LocalCodexRunnerEvent[] = [];
      let stdoutBytes = 0;
      const stdoutChunks: string[] = [];
      let timedOut = false;
      let truncated = false;
      let killed = false;

      let child: ChildProcess;
      try {
        child = this.spawnImpl('codex', args, {
          cwd: input.cwd,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (err) {
        resolve({
          ok: false,
          events: [],
          errorSummary: `spawn failed: ${String(err)}`,
        });
        return;
      }

      const timer = setTimeout(() => {
        timedOut = true;
        killed = true;
        child.kill('SIGTERM');
      }, timeoutMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        if (killed) return;
        const str = chunk.toString('utf-8');
        stdoutBytes += Buffer.byteLength(str, 'utf-8');
        if (stdoutBytes > maxOutputBytes) {
          truncated = true;
          if (!killed) {
            killed = true;
            child.kill('SIGTERM');
          }
          return;
        }
        stdoutChunks.push(str);
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        if (!killed) {
          events.push({
            type: 'stderr',
            message: chunk.toString('utf-8').trim().slice(0, 500),
          });
        }
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        if (!killed) {
          resolve({
            ok: false,
            events,
            errorSummary: `process error: ${err.message}`,
          });
        }
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timer);

        // Parse accumulated stdout as JSONL
        const all = stdoutChunks.join('');
        const lines = all.split('\n');

        let finalMessage: string | undefined;

        for (const line of lines) {
          const obj = parseJsonlLine(line);
          if (!obj) {
            if (line.trim()) {
              events.push({ type: 'raw', message: line.trim().slice(0, 500) });
            }
            continue;
          }
          const event = extractEvent(obj);
          events.push(event);
          if (event.message && event.message.length > 0) {
            finalMessage = event.message;
          }
        }

        if (timedOut) {
          resolve({
            ok: false,
            finalMessage,
            events,
            exitCode: code,
            errorSummary: `timed out after ${timeoutMs}ms`,
            timedOut: true,
            truncated,
          });
          return;
        }

        if (truncated) {
          resolve({
            ok: false,
            finalMessage,
            events,
            exitCode: code,
            errorSummary: `output exceeded ${maxOutputBytes} bytes`,
            truncated: true,
          });
          return;
        }

        if (code !== 0 && code !== null) {
          resolve({
            ok: false,
            finalMessage,
            events,
            exitCode: code,
            errorSummary: `codex exited with code ${code}`,
          });
          return;
        }

        resolve({
          ok: true,
          finalMessage,
          events,
          exitCode: code,
        });
      });
    });
  }
}
