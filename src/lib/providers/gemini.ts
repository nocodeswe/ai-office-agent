import {
  LLMProvider,
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionMessage,
  ModelInfo,
} from './base';

const DEFAULT_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_COUNT = 3;

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retryCount = config.retryCount ?? DEFAULT_RETRY_COUNT;
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        if (response.status === 429 || response.status >= 500) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Gemini API error ${response.status}: ${errorText}`
          );
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error(`Request timed out after ${this.timeout}ms`);
        }

        const isRetryable =
          lastError.message.includes('HTTP 429') ||
          lastError.message.includes('HTTP 5') ||
          lastError.message.includes('timed out');

        if (!isRetryable || attempt === this.retryCount) {
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  private get headers(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  private urlWithKey(path: string): string {
    const separator = path.includes('?') ? '&' : '?';
    return `${this.baseUrl}${path}${separator}key=${this.apiKey}`;
  }

  private toGeminiContents(
    messages: ChatCompletionMessage[]
  ): { contents: GeminiContent[]; systemInstruction?: { parts: { text: string }[] } } {
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const contents: GeminiContent[] = nonSystemMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result: { contents: GeminiContent[]; systemInstruction?: { parts: { text: string }[] } } = { contents };

    if (systemMessage) {
      result.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    return result;
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await this.fetchWithRetry(
      this.urlWithKey('/models'),
      { method: 'GET', headers: this.headers }
    );

    const data = await response.json();
    return (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes('generateContent')
      )
      .map((m: { name: string; displayName?: string }) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName ?? m.name,
        provider: 'gemini',
      }));
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { contents, systemInstruction } = this.toGeminiContents(
      request.messages
    );

    const body: Record<string, unknown> = {
      contents,
      ...(systemInstruction && { systemInstruction }),
      generationConfig: {
        ...(request.maxTokens != null && { maxOutputTokens: request.maxTokens }),
        ...(request.temperature != null && { temperature: request.temperature }),
      },
    };

    const response = await this.fetchWithRetry(
      this.urlWithKey(`/models/${request.model}:generateContent`),
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text =
      candidate?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('') ?? '';

    return {
      content: text,
      model: request.model,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  async *chatStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<string, void, unknown> {
    const { contents, systemInstruction } = this.toGeminiContents(
      request.messages
    );

    const body: Record<string, unknown> = {
      contents,
      ...(systemInstruction && { systemInstruction }),
      generationConfig: {
        ...(request.maxTokens != null && { maxOutputTokens: request.maxTokens }),
        ...(request.temperature != null && { temperature: request.temperature }),
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        this.urlWithKey(
          `/models/${request.model}:streamGenerateContent?alt=sse`
        ),
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const text = parsed.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text ?? '')
              .join('');
            if (text) yield text;
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch {
      return false;
    }
  }
}
