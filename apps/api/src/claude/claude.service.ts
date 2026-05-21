import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { getCharacterTemplate, parseEmotionOverride, stripEmotionTags, type CharacterMood } from '@squad/core';

export type StreamChunkEvent = {
  chunk: string;
  moodOverride: CharacterMood | null;
};

@Injectable()
export class ClaudeService {
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async *streamResponse(
    characterId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
  ): AsyncGenerator<StreamChunkEvent> {
    const template = getCharacterTemplate(characterId);
    const systemPrompt = template?.systemPrompt ?? 'You are a helpful assistant.';

    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    const stream = await this.client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const raw = event.delta.text;
        const moodOverride = parseEmotionOverride(raw);
        const chunk = stripEmotionTags(raw);
        yield { chunk, moodOverride };
      }
    }
  }
}
