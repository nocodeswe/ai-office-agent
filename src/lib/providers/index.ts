import { Provider } from '@/types';
import { LLMProvider } from './base';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { GeminiProvider } from './gemini';
import { OllamaProvider } from './ollama';
import { NvidiaProvider } from './nvidia';

export type { LLMProvider } from './base';
export type {
  ChatCompletionMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelInfo,
  ProviderConfig,
} from './base';
export { OpenAIProvider } from './openai';
export { ClaudeProvider } from './claude';
export { GeminiProvider } from './gemini';
export { OllamaProvider } from './ollama';
export { NvidiaProvider } from './nvidia';

export function createProvider(provider: Provider): LLMProvider {
  const config = {
    apiKey: provider.apiKey,
    baseUrl: provider.apiBaseUrl || undefined,
    timeout: provider.timeout || undefined,
    retryCount: provider.retryCount || undefined,
  };

  switch (provider.type) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'claude':
      return new ClaudeProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'nvidia':
      return new NvidiaProvider(config);
    default: {
      const _exhaustive: never = provider.type;
      throw new Error(`Unsupported provider type: ${_exhaustive}`);
    }
  }
}
