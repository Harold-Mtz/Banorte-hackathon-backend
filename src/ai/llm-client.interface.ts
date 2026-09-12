export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMClient {
  generate(messages: LLMMessage[]): Promise<string>;
}