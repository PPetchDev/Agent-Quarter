export type ChatTurn = { role: 'user' | 'assistant'; content: string };

type StoredMessage = { role: string; content: string };

const isChatTurn = (m: StoredMessage): m is ChatTurn => m.role === 'user' || m.role === 'assistant';

/**
 * Turns a stored history window (oldest first, ending with the just-saved user message)
 * into the prior turns for the model. The last message is dropped because it is sent
 * separately, only user/assistant turns are kept, and the window starts on a user turn
 * so truncation never opens on an assistant reply whose question was cut off.
 */
export function toPriorTurns(history: ReadonlyArray<StoredMessage>): ChatTurn[] {
  const prior = history.slice(0, -1).filter(isChatTurn);
  const firstUserIndex = prior.findIndex((m) => m.role === 'user');
  if (firstUserIndex === -1) return [];
  return prior.slice(firstUserIndex).map(({ role, content }) => ({ role, content }));
}
