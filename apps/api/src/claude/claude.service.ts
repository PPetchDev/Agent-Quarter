import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  getCharacterTemplate,
  parseEmotionOverride,
  stripEmotionTags,
  type CharacterMood,
} from '@squad/core';
import type {
  LlmTextProvider,
  LlmTextProviderInput,
  LlmTextProviderResult,
} from '../llm/llm-provider.interface';

export type StreamChunkEvent = {
  chunk: string;
  moodOverride: CharacterMood | null;
};

@Injectable()
export class ClaudeService implements LlmTextProvider {
  private readonly client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    this.client = new Anthropic({ apiKey });
  }

  async *streamResponse(
    characterId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
  ): AsyncGenerator<StreamChunkEvent> {
    const template = getCharacterTemplate(characterId);
    const systemPrompt = template?.systemPrompt ?? 'You are a helpful assistant.';

    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
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

  async generateText(input: LlmTextProviderInput): Promise<LlmTextProviderResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: input.maxTokens ?? 256,
      system: input.prompt,
      messages: [{ role: 'user', content: 'Respond with the dialogue line only.' }],
    });

    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    return { text, model: 'claude-sonnet-4-6' };
  }
}
