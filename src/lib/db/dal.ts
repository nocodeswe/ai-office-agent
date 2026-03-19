import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import type {
  Provider,
  ProviderType,
  Model,
  ChatSession,
  ChatMessage,
  ChatMode,
  DocumentType,
  MessageRole,
  UserInstruction,
  InstructionScope,
  ChangeLogEntry,
} from '@/types';

// ─── Row ↔ Domain mappers ───────────────────────────────────────────────────

interface ProviderRow {
  id: string;
  name: string;
  type: ProviderType;
  enabled: number;
  api_key: string;
  api_base_url: string;
  default_model: string;
  timeout: number;
  retry_count: number;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

function toProvider(row: ProviderRow): Provider {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    enabled: row.enabled === 1,
    apiKey: row.api_key,
    apiBaseUrl: row.api_base_url,
    defaultModel: row.default_model,
    timeout: row.timeout,
    retryCount: row.retry_count,
    maxTokens: row.max_tokens,
    temperature: row.temperature,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ModelRow {
  id: string;
  provider_id: string;
  model_id: string;
  name: string;
  enabled: number;
  created_at: string;
}

function toModel(row: ModelRow): Model {
  return {
    id: row.id,
    providerId: row.provider_id,
    modelId: row.model_id,
    name: row.name,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

interface SessionRow {
  id: string;
  title: string;
  document_name: string;
  document_type: DocumentType;
  mode: ChatMode;
  provider_id: string;
  model_id: string;
  created_at: string;
  updated_at: string;
}

function toSession(row: SessionRow): ChatSession {
  return {
    id: row.id,
    title: row.title,
    documentName: row.document_name,
    documentType: row.document_type,
    mode: row.mode,
    providerId: row.provider_id,
    modelId: row.model_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface MessageRow {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  mode: ChatMode;
  model_id: string;
  created_at: string;
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    mode: row.mode,
    modelId: row.model_id,
    createdAt: row.created_at,
  };
}

interface InstructionRow {
  id: string;
  title: string;
  content: string;
  enabled: number;
  priority: number;
  scope: InstructionScope;
  scope_value: string | null;
  created_at: string;
  updated_at: string;
}

function toInstruction(row: InstructionRow): UserInstruction {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    enabled: row.enabled === 1,
    priority: row.priority,
    scope: row.scope,
    scopeValue: row.scope_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ChangeLogRow {
  id: string;
  session_id: string;
  document_name: string;
  operation_type: string;
  old_value: string | null;
  new_value: string | null;
  description: string;
  model_id: string;
  created_at: string;
}

function toChangeLogEntry(row: ChangeLogRow): ChangeLogEntry {
  return {
    id: row.id,
    sessionId: row.session_id,
    documentName: row.document_name,
    operationType: row.operation_type,
    oldValue: row.old_value,
    newValue: row.new_value,
    description: row.description,
    modelId: row.model_id,
    createdAt: row.created_at,
  };
}

// ─── Providers ──────────────────────────────────────────────────────────────

export function getAllProviders(): Provider[] {
  const rows = getDb().prepare('SELECT * FROM providers ORDER BY name').all() as ProviderRow[];
  return rows.map(toProvider);
}

export function getProvider(id: string): Provider | undefined {
  const row = getDb().prepare('SELECT * FROM providers WHERE id = ?').get(id) as ProviderRow | undefined;
  return row ? toProvider(row) : undefined;
}

export function createProvider(data: {
  name: string;
  type: ProviderType;
  enabled?: boolean;
  apiKey?: string;
  apiBaseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  retryCount?: number;
  maxTokens?: number;
  temperature?: number;
}): Provider {
  const id = uuidv4();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO providers (id, name, type, enabled, api_key, api_base_url, default_model, timeout, retry_count, max_tokens, temperature, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.name,
      data.type,
      data.enabled !== false ? 1 : 0,
      data.apiKey ?? '',
      data.apiBaseUrl ?? '',
      data.defaultModel ?? '',
      data.timeout ?? 30000,
      data.retryCount ?? 3,
      data.maxTokens ?? 4096,
      data.temperature ?? 0.7,
      now,
      now
    );

  return getProvider(id)!;
}

export function updateProvider(
  id: string,
  data: Partial<Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>>
): Provider | undefined {
  const existing = getProvider(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
  if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
  if (data.apiKey !== undefined) { fields.push('api_key = ?'); values.push(data.apiKey); }
  if (data.apiBaseUrl !== undefined) { fields.push('api_base_url = ?'); values.push(data.apiBaseUrl); }
  if (data.defaultModel !== undefined) { fields.push('default_model = ?'); values.push(data.defaultModel); }
  if (data.timeout !== undefined) { fields.push('timeout = ?'); values.push(data.timeout); }
  if (data.retryCount !== undefined) { fields.push('retry_count = ?'); values.push(data.retryCount); }
  if (data.maxTokens !== undefined) { fields.push('max_tokens = ?'); values.push(data.maxTokens); }
  if (data.temperature !== undefined) { fields.push('temperature = ?'); values.push(data.temperature); }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  getDb().prepare(`UPDATE providers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getProvider(id);
}

export function deleteProvider(id: string): boolean {
  const result = getDb().prepare('DELETE FROM providers WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Models ─────────────────────────────────────────────────────────────────

export function getModelsByProvider(providerId: string): Model[] {
  const rows = getDb()
    .prepare('SELECT * FROM models WHERE provider_id = ? ORDER BY name')
    .all(providerId) as ModelRow[];
  return rows.map(toModel);
}

export function getAllEnabledModels(): Model[] {
  const rows = getDb()
    .prepare('SELECT * FROM models WHERE enabled = 1 ORDER BY name')
    .all() as ModelRow[];
  return rows.map(toModel);
}

export function createModel(data: {
  providerId: string;
  modelId: string;
  name: string;
  enabled?: boolean;
}): Model {
  const id = uuidv4();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO models (id, provider_id, model_id, name, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, data.providerId, data.modelId, data.name, data.enabled !== false ? 1 : 0, now);

  const row = getDb().prepare('SELECT * FROM models WHERE id = ?').get(id) as ModelRow;
  return toModel(row);
}

export function updateModel(id: string, data: { enabled?: boolean; name?: string }): Model | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }

  if (fields.length === 0) return undefined;

  values.push(id);
  getDb().prepare(`UPDATE models SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = getDb().prepare('SELECT * FROM models WHERE id = ?').get(id) as ModelRow | undefined;
  return row ? toModel(row) : undefined;
}

export function deleteModelsByProvider(providerId: string): number {
  const result = getDb().prepare('DELETE FROM models WHERE provider_id = ?').run(providerId);
  return result.changes;
}

// ─── Chat Sessions ──────────────────────────────────────────────────────────

export function getAllSessions(): ChatSession[] {
  const rows = getDb()
    .prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC')
    .all() as SessionRow[];
  return rows.map(toSession);
}

export function getSession(id: string): ChatSession | undefined {
  const row = getDb().prepare('SELECT * FROM chat_sessions WHERE id = ?').get(id) as SessionRow | undefined;
  return row ? toSession(row) : undefined;
}

export function createSession(data: {
  title: string;
  documentName?: string;
  documentType: DocumentType;
  mode: ChatMode;
  providerId: string;
  modelId: string;
}): ChatSession {
  const id = uuidv4();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO chat_sessions (id, title, document_name, document_type, mode, provider_id, model_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, data.title, data.documentName ?? '', data.documentType, data.mode, data.providerId, data.modelId, now, now);

  return getSession(id)!;
}

export function updateSession(
  id: string,
  data: Partial<Pick<ChatSession, 'title' | 'documentName' | 'mode' | 'providerId' | 'modelId'>>
): ChatSession | undefined {
  const existing = getSession(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.documentName !== undefined) { fields.push('document_name = ?'); values.push(data.documentName); }
  if (data.mode !== undefined) { fields.push('mode = ?'); values.push(data.mode); }
  if (data.providerId !== undefined) { fields.push('provider_id = ?'); values.push(data.providerId); }
  if (data.modelId !== undefined) { fields.push('model_id = ?'); values.push(data.modelId); }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  getDb().prepare(`UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getSession(id);
}

export function deleteSession(id: string): boolean {
  const result = getDb().prepare('DELETE FROM chat_sessions WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Chat Messages ──────────────────────────────────────────────────────────

export function getMessagesBySession(sessionId: string): ChatMessage[] {
  const rows = getDb()
    .prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId) as MessageRow[];
  return rows.map(toMessage);
}

export function createMessage(data: {
  sessionId: string;
  role: MessageRole;
  content: string;
  mode: ChatMode;
  modelId: string;
}): ChatMessage {
  const id = uuidv4();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO chat_messages (id, session_id, role, content, mode, model_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, data.sessionId, data.role, data.content, data.mode, data.modelId, now);

  const row = getDb().prepare('SELECT * FROM chat_messages WHERE id = ?').get(id) as MessageRow;
  return toMessage(row);
}

// ─── User Instructions ──────────────────────────────────────────────────────

export function getAllInstructions(): UserInstruction[] {
  const rows = getDb()
    .prepare('SELECT * FROM user_instructions ORDER BY priority DESC, created_at ASC')
    .all() as InstructionRow[];
  return rows.map(toInstruction);
}

export function getInstruction(id: string): UserInstruction | undefined {
  const row = getDb().prepare('SELECT * FROM user_instructions WHERE id = ?').get(id) as InstructionRow | undefined;
  return row ? toInstruction(row) : undefined;
}

export function createInstruction(data: {
  title: string;
  content: string;
  enabled?: boolean;
  priority?: number;
  scope?: InstructionScope;
  scopeValue?: string | null;
}): UserInstruction {
  const id = uuidv4();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO user_instructions (id, title, content, enabled, priority, scope, scope_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.title,
      data.content,
      data.enabled !== false ? 1 : 0,
      data.priority ?? 0,
      data.scope ?? 'all',
      data.scopeValue ?? null,
      now,
      now
    );

  return getInstruction(id)!;
}

export function updateInstruction(
  id: string,
  data: Partial<Omit<UserInstruction, 'id' | 'createdAt' | 'updatedAt'>>
): UserInstruction | undefined {
  const existing = getInstruction(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
  if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
  if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
  if (data.scope !== undefined) { fields.push('scope = ?'); values.push(data.scope); }
  if (data.scopeValue !== undefined) { fields.push('scope_value = ?'); values.push(data.scopeValue); }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  getDb().prepare(`UPDATE user_instructions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getInstruction(id);
}

export function deleteInstruction(id: string): boolean {
  const result = getDb().prepare('DELETE FROM user_instructions WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getActiveInstructions(filters?: {
  scope?: InstructionScope;
  scopeValue?: string;
}): UserInstruction[] {
  let sql = 'SELECT * FROM user_instructions WHERE enabled = 1';
  const params: unknown[] = [];

  if (filters?.scope) {
    sql += ' AND (scope = ? OR scope = ?)';
    params.push(filters.scope, 'all');

    if (filters.scopeValue) {
      sql += ' AND (scope_value IS NULL OR scope_value = ?)';
      params.push(filters.scopeValue);
    }
  }

  sql += ' ORDER BY priority DESC, created_at ASC';

  const rows = getDb().prepare(sql).all(...params) as InstructionRow[];
  return rows.map(toInstruction);
}

// ─── Change Log ─────────────────────────────────────────────────────────────

export function getChangeLog(sessionId?: string): ChangeLogEntry[] {
  if (sessionId) {
    const rows = getDb()
      .prepare('SELECT * FROM change_log WHERE session_id = ? ORDER BY created_at DESC')
      .all(sessionId) as ChangeLogRow[];
    return rows.map(toChangeLogEntry);
  }

  const rows = getDb()
    .prepare('SELECT * FROM change_log ORDER BY created_at DESC')
    .all() as ChangeLogRow[];
  return rows.map(toChangeLogEntry);
}

export function createChangeLogEntry(data: {
  sessionId: string;
  documentName: string;
  operationType: string;
  oldValue?: string | null;
  newValue?: string | null;
  description: string;
  modelId: string;
}): ChangeLogEntry {
  const id = uuidv4();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO change_log (id, session_id, document_name, operation_type, old_value, new_value, description, model_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.sessionId,
      data.documentName,
      data.operationType,
      data.oldValue ?? null,
      data.newValue ?? null,
      data.description,
      data.modelId,
      now
    );

  const row = getDb().prepare('SELECT * FROM change_log WHERE id = ?').get(id) as ChangeLogRow;
  return toChangeLogEntry(row);
}
