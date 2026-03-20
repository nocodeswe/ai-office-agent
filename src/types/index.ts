export type ProviderType = 'openai' | 'claude' | 'gemini' | 'ollama' | 'nvidia';

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  enabled: boolean;
  apiKey: string;
  apiBaseUrl: string;
  defaultModel: string;
  autoParameters: boolean;
  timeout: number;
  retryCount: number;
  maxTokens: number;
  temperature: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendedModelParameters {
  temperature: number;
  maxTokens: number;
  note: string;
}

export type ModelOptimizationGoal = 'speed' | 'balanced' | 'quality';
export type ModelTaskIntent = 'general' | 'analysis' | 'writing' | 'coding';

export interface AutoTuneOverrides {
  temperature?: number;
  maxTokens?: number;
}

export interface Model {
  id: string;
  providerId: string;
  modelId: string;
  name: string;
  enabled: boolean;
  family?: string;
  description?: string;
  profile?: 'Fast' | 'Balanced' | 'Deep';
  contextWindow?: string;
  capabilities?: string[];
  limitations?: string[];
  bestFor?: string[];
  recommendedParameters?: RecommendedModelParameters;
  createdAt: string;
}

export type DocumentType = 'word' | 'excel' | 'powerpoint';
export type ChatMode = 'ask' | 'agent';

export interface ChatSession {
  id: string;
  title: string;
  documentName: string;
  documentType: DocumentType;
  mode: ChatMode;
  providerId: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  mode: ChatMode;
  modelId: string;
  createdAt: string;
}

export type InstructionScope = 'all' | 'document' | 'mode' | 'provider';

export interface UserInstruction {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  priority: number;
  scope: InstructionScope;
  scopeValue: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeLogEntry {
  id: string;
  sessionId: string;
  documentName: string;
  operationType: string;
  oldValue: string | null;
  newValue: string | null;
  description: string;
  modelId: string;
  createdAt: string;
}

export interface DocumentContext {
  type: DocumentType;
  name: string;
  content: string;
}
