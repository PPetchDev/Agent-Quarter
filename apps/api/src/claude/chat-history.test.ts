import { describe, expect, it } from 'vitest';
import { toPriorTurns } from './chat-history';

const msg = (role: string, content: string) => ({ role, content });

describe('toPriorTurns', () => {
  it('drops the just-saved user message, which is sent separately', () => {
    expect(
      toPriorTurns([msg('user', 'hi'), msg('assistant', 'hello'), msg('user', 'again')]),
    ).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]);
  });

  it('starts on a user turn when the window cuts off before an assistant reply', () => {
    expect(
      toPriorTurns([
        msg('assistant', 'orphaned reply'),
        msg('user', 'question'),
        msg('assistant', 'answer'),
        msg('user', 'current'),
      ]),
    ).toEqual([
      { role: 'user', content: 'question' },
      { role: 'assistant', content: 'answer' },
    ]);
  });

  it('keeps only user and assistant turns', () => {
    expect(
      toPriorTurns([
        msg('system', 'note'),
        msg('user', 'question'),
        msg('system', 'aside'),
        msg('assistant', 'answer'),
        msg('user', 'current'),
      ]),
    ).toEqual([
      { role: 'user', content: 'question' },
      { role: 'assistant', content: 'answer' },
    ]);
  });

  it('returns no prior turns for the first message of a conversation', () => {
    expect(toPriorTurns([msg('user', 'first')])).toEqual([]);
  });
});
