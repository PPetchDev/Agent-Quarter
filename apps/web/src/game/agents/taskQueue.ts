import type { AgentTaskType } from './agentTypes';

/**
 * Hard cap on the agent's pending task queue length. Enqueuing past this
 * limit drops the new task; the existing queue is returned unchanged.
 * Chosen to keep the queue chip row readable in the compact HUD.
 */
export const MAX_TASK_QUEUE_LENGTH = 8;

/**
 * Append a task to the back of the queue. Returns a new array; never mutates.
 * Returns the queue unchanged when already at `MAX_TASK_QUEUE_LENGTH`.
 */
export function enqueueTask(
  queue: readonly AgentTaskType[],
  task: AgentTaskType,
): AgentTaskType[] {
  if (queue.length >= MAX_TASK_QUEUE_LENGTH) return queue.slice();
  return [...queue, task];
}

/**
 * Pop the head task. Returns the next task plus the remaining queue.
 * For an empty queue, `next` is `null` and `rest` is an empty array.
 */
export function dequeueTask(
  queue: readonly AgentTaskType[],
): { next: AgentTaskType | null; rest: AgentTaskType[] } {
  if (queue.length === 0) {
    return { next: null, rest: [] };
  }
  const [head, ...rest] = queue;
  return { next: head ?? null, rest };
}
