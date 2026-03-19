import {
  LLMProvider,
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelInfo,
} from './base';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_TIMEOUT = 60000;
const DEFAULT_API_KEY = process.env.OLLAMA_API_KEY;

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private thisApiToken?: string;
  private timeout: number;

  constructor(config: ProviderConfig) {
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.thisApiToken = config?.apiKey || DEFAULT_API_KEY;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error ${response.status}: ${errorText}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private get headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.thisApiToken}` };
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tags`, {
      method: 'GET',
    });

    const data = await response.json();
    return (data.models ?? []).map(
      (m: { name: string; model?: string }) => ({
        id: m.model ?? m.name,
        name: m.name,
        provider: 'ollama',
      })
    );
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const body = {
      model: request.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        ...(request.maxTokens != null && { num_predict: request.maxTokens }),
        ...(request.temperature != null && {
          temperature: request.temperature,
        }),
      },
    };

    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      content: data.message?.content ?? '',
      model: data.model ?? request.model,
      usage: data.prompt_eval_count != null
        ? {
            promptTokens: data.prompt_eval_count ?? 0,
            completionTokens: data.eval_count ?? 0,
            totalTokens:
              (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
          }
        : undefined,
    };
  }

  async *chatStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<string, void, unknown> {
    const body = {
      model: request.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      options: {
        ...(request.maxTokens != null && { num_predict: request.maxTokens }),
        ...(request.temperature != null && {
          temperature: request.temperature,
        }),
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error ${response.status}: ${errorText}`);
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
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.message?.content) {
              yield parsed.message.content;
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
      await this.fetchWithTimeout(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return true;
    } catch {
      return false;
    }
  }
}
