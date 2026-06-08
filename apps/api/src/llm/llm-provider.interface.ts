// ─── Provider-neutral LLM text generation interface ────────────────────────────

export type LlmTextProviderInput = {
  prompt: string;
  maxTokens?: number;
};

export type LlmTextProviderResult = {
  text: string;
  model?: string;
};

export interface LlmTextProvider {
  generateText(input: LlmTextProviderInput): Promise<LlmTextProviderResult>;
}

/** NestJS injection token for the current LLM text provider implementation. */
export const LLM_TEXT_PROVIDER = 'LLM_TEXT_PROVIDER';
