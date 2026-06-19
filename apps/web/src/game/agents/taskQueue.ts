import type { AgentTaskType } from './agentTypes';

/**
 * Default hard cap on the agent's pending task queue length. Callers can pass
 * a custom `maxLength` to `enqueueTask` or to `useAgentWalk` options.
 * Chosen to keep the queue chip row readable in the compact HUD.
 */
export const MAX_TASK_QUEUE_LENGTH = 8;

function normalizeQueueCap(maxLength: number): number {
  return Math.max(1, Math.floor(maxLength));
}

/**
 * Append a task to the back of the queue. Returns a new array; never mutates.
 * Returns the queue unchanged when already at the cap.
 *
 * @param maxLength Optional override for the queue cap. Defaults to
 *   `MAX_TASK_QUEUE_LENGTH`. Values < 1 are treated as 1.
 */
export function enqueueTask(
  queue: readonly AgentTaskType[],
  task: AgentTaskType,
  maxLength: number = MAX_TASK_QUEUE_LENGTH,
): AgentTaskType[] {
  const cap = normalizeQueueCap(maxLength);
  if (queue.length >= cap) return queue.slice();
  return [...queue, task];
}

/**
 * Pop the head task. Returns the next task plus the remaining queue.
 * For an empty queue, `next` is `null` and `rest` is an empty array.
 */
export function dequeueTask(queue: readonly AgentTaskType[]): {
  next: AgentTaskType | null;
  rest: AgentTaskType[];
} {
  if (queue.length === 0) {
    return { next: null, rest: [] };
  }
  const [head, ...rest] = queue;
  return { next: head ?? null, rest };
}
