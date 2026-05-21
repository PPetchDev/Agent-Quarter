export type StageRuntimeState = 'processing' | 'idle';

const DEFAULT_IDLE_AFTER_MS = 1_600;

export class StageTracker {
  private state: StageRuntimeState;
  private idleDeadlineAt: number | null = null;
  private readonly idleAfterMs: number;
  private readonly now: () => number;

  constructor(options?: { initialState?: StageRuntimeState; idleAfterMs?: number; now?: () => number }) {
    this.state = options?.initialState ?? 'idle';
    this.idleAfterMs = options?.idleAfterMs ?? DEFAULT_IDLE_AFTER_MS;
    this.now = options?.now ?? Date.now;
    if (this.state === 'processing') {
      this.idleDeadlineAt = this.now() + this.idleAfterMs;
    }
  }

  get currentState(): StageRuntimeState {
    return this.state;
  }

  observeSubmit(now = this.now()): StageRuntimeState | null {
    this.idleDeadlineAt = now + this.idleAfterMs;
    if (this.state === 'processing') return null;
    this.state = 'processing';
    return 'processing';
  }

  observeChunk(now = this.now()): void {
    if (this.state === 'processing') {
      this.idleDeadlineAt = now + this.idleAfterMs;
    }
  }

  poll(now = this.now()): StageRuntimeState | null {
    if (this.state !== 'processing' || this.idleDeadlineAt === null) return null;
    if (now < this.idleDeadlineAt) return null;
    this.state = 'idle';
    this.idleDeadlineAt = null;
    return 'idle';
  }

  forceIdle(): void {
    this.state = 'idle';
    this.idleDeadlineAt = null;
  }
}
