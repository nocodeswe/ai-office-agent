import {
  LLMProvider,
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelInfo,
} from './base';

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_COUNT = 3;
const ANTHROPIC_VERSION = '2023-06-01';

const CLAUDE_MODELS: ModelInfo[] = [
  { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', provider: 'claude' },
  { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', provider: 'claude' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'claude' },
  { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', provider: 'claude' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet', provider: 'claude' },
  { id: 'claude-opus-4-20250514', name: 'Claude 4 Opus', provider: 'claude' },
];

export class ClaudeProvider implements LLMProvider {
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
            `Anthropic API error ${response.status}: ${errorText}`
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
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [...CLAUDE_MODELS];
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const nonSystemMessages = request.messages.filter(
      (m) => m.role !== 'system'
    );

    const body: Record<string, unknown> = {
      model: request.model,
      messages: nonSystemMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: request.maxTokens ?? 4096,
      ...(request.temperature != null && { temperature: request.temperature }),
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const textBlock = data.content?.find(
      (b: { type: string }) => b.type === 'text'
    );

    return {
      content: textBlock?.text ?? '',
      model: data.model ?? request.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens ?? 0,
            completionTokens: data.usage.output_tokens ?? 0,
            totalTokens:
              (data.usage.input_tokens ?? 0) +
              (data.usage.output_tokens ?? 0),
          }
        : undefined,
    };
  }

  async *chatStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<string, void, unknown> {
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const nonSystemMessages = request.messages.filter(
      (m) => m.role !== 'system'
    );

    const body: Record<string, unknown> = {
      model: request.model,
      messages: nonSystemMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: request.maxTokens ?? 4096,
      ...(request.temperature != null && { temperature: request.temperature }),
      stream: true,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Anthropic API error ${response.status}: ${errorText}`
        );
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
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              yield parsed.delta.text;
            }
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
      await this.chat({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 10,
      });
      return true;
    } catch {
      return false;
    }
  }
}
