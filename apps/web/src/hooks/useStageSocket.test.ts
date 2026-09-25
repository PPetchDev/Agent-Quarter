// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Handler = (payload: unknown) => void;
const handlers = new Map<string, Set<Handler>>();
const fakeSocket = {
  on: (event: string, handler: Handler) => {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(handler);
  },
  off: (event: string, handler: Handler) => handlers.get(event)?.delete(handler),
  emit: vi.fn(),
};
const serverSends = (event: string, payload: unknown) =>
  act(() => handlers.get(event)?.forEach((handler) => handler(payload)));

vi.mock('./useSocket', () => ({ useSocket: () => fakeSocket }));

const { useStageSocket } = await import('./useStageSocket');

const rejection = (characterId: string) => ({
  status: 'error',
  message: 'content must be shorter than or equal to 4000 characters',
  cause: { pattern: 'send_message', data: { characterId, content: '...' } },
});

describe('useStageSocket validation errors', () => {
  afterEach(cleanup);

  it('surfaces a rejected send_message as lastError', () => {
    const { result } = renderHook(() => useStageSocket('yui'));

    serverSends('exception', rejection('yui'));

    expect(result.current.lastError).toBe(
      'content must be shorter than or equal to 4000 characters',
    );
  });

  it("ignores rejections for another character's chat on the shared socket", () => {
    const { result } = renderHook(() => useStageSocket('yui'));

    serverSends('exception', rejection('aki'));

    expect(result.current.lastError).toBeNull();
  });

  it('stops listening after unmount', () => {
    const { unmount } = renderHook(() => useStageSocket('yui'));
    unmount();
    expect(handlers.get('exception')?.size ?? 0).toBe(0);
  });
});
