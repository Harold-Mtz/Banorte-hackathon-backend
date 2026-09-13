import { GoogleGenAI } from '@google/genai';

import {
  LLMClient,
  LLMMessage
} from './llm-client.interface';

// One retry for transient provider failures, sharing the original deadline.
// Authentication, quota and malformed-response failures are never retried here.
export async function requestWithTransientRetry<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs = 4500): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await operation(signal);
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    if (signal.aborted || !status || ![500, 502, 503, 504].includes(status)) throw error;
    await new Promise(resolve => setTimeout(resolve, 200));
    signal.throwIfAborted();
    return operation(signal);
  }
}

export class GeminiClient implements LLMClient {

  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor() {

    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        'GEMINI_API_KEY is not configured'
      );
    }

    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    this.model =
      process.env.GEMINI_MODEL ??
      'gemini-3.8-flash';
  }

  async generate(
    messages: LLMMessage[]
  ): Promise<string> {

    const systemMessages =
      messages
        .filter(message => message.role === 'system')
        .map(message => message.content)
        .join('\n');

    const conversation =
      messages
        .filter(message => message.role !== 'system')
        .map(message => {
          return `${message.role.toUpperCase()}: ${message.content}`;
        })
        .join('\n');

    const response =
      await requestWithTransientRetry(signal => this.client.models.generateContent({
        model: this.model,

        contents: conversation,

        config: {
          // A bounded provider request also stops network work after the UI fallback deadline.
          abortSignal: signal,
          systemInstruction:
            systemMessages || undefined
        }
      }));

    return response.text ?? '';
  }
}
