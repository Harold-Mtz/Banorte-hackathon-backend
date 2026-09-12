import { GoogleGenAI } from '@google/genai';

import {
  LLMClient,
  LLMMessage
} from './llm-client.interface';

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
      await this.client.models.generateContent({
        model: this.model,

        contents: conversation,

        config: {
          systemInstruction:
            systemMessages || undefined
        }
      });

    return response.text ?? '';
  }
}