import type { AgentTaskType } from './agentTypes';

/**
 * Append a task to the back of the queue. Returns a new array; never mutates.
 */
export function enqueueTask(
  queue: readonly AgentTaskType[],
  task: AgentTaskType,
): AgentTaskType[] {
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
