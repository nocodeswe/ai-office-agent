'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Spin, Tag, Typography, message } from 'antd';
import {
  HistoryOutlined,
  RobotOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import ModelSelector from '@/components/chat/ModelSelector';
import InstructionSelector from '@/components/chat/InstructionSelector';
import DocumentIndicator from '@/components/chat/DocumentIndicator';
import { relativeTime } from '@/lib/utils';
import type {
  ChatMessage as ChatMessageType,
  ChatMode,
  ChatSession,
  Model,
  Provider,
  UserInstruction,
} from '@/types';

const { Title, Text } = Typography;

interface DocumentInfo {
  type: string;
  name: string;
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [instructions, setInstructions] = useState<UserInstruction[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedMode, setSelectedMode] = useState<ChatMode>('ask');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [activeInstructionIds, setActiveInstructionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const filteredModels = useMemo(
    () => models.filter((model) => model.providerId === selectedProviderId && model.enabled),
    [models, selectedProviderId]
  );

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const refreshWorkspace = useCallback(async () => {
    const [providersRes, modelsRes, instructionsRes] = await Promise.all([
      fetch('/api/providers'),
      fetch('/api/models'),
      fetch('/api/instructions'),
    ]);

    const [providersData, modelsData, instructionsData] = await Promise.all([
      providersRes.json() as Promise<Provider[]>,
      modelsRes.json() as Promise<Model[]>,
      instructionsRes.json() as Promise<UserInstruction[]>,
    ]);

    setProviders(providersData);
    setModels(modelsData);
    setInstructions(instructionsData);
    setActiveInstructionIds(
      instructionsData.filter((instruction) => instruction.enabled).map((instruction) => instruction.id)
    );

    const enabledProvider = providersData.find((provider) => provider.enabled);
    const nextProviderId =
      selectedProviderId &&
      providersData.some((provider) => provider.id === selectedProviderId && provider.enabled)
        ? selectedProviderId
        : enabledProvider?.id ?? '';

    setSelectedProviderId(nextProviderId);

    const providerModels = modelsData.filter(
      (model) => model.providerId === nextProviderId && model.enabled
    );
    const nextModelId =
      selectedModelId && providerModels.some((model) => model.id === selectedModelId)
        ? selectedModelId
        : providerModels[0]?.id ?? '';

    setSelectedModelId(nextModelId);
  }, [selectedModelId, selectedProviderId]);

  useEffect(() => {
    async function init() {
      setBootstrapping(true);

      try {
        await refreshWorkspace();
      } catch (error) {
        console.error('Failed to load workspace:', error);
        message.error('Failed to load providers and settings');
      }

      try {
        const { getDocumentInfo } = await import('@/lib/office/context');
        const info = await getDocumentInfo();
        setDocumentInfo(info);
      } catch {
        setDocumentInfo(null);
      } finally {
        setBootstrapping(false);
      }
    }

    init();
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!currentSession || !selectedProviderId || !selectedModelId) return;

    fetch(`/api/sessions/${currentSession.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: selectedMode,
        providerId: selectedProviderId,
        modelId: selectedModelId,
      }),
    }).catch(() => undefined);
  }, [currentSession, selectedMode, selectedProviderId, selectedModelId]);

  const ensureSession = useCallback(
    async (providerId: string, modelId: string, mode: ChatMode) => {
      if (currentSession) return currentSession;

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: documentInfo?.name ? `Chat · ${documentInfo.name}` : 'New Chat',
          documentName: documentInfo?.name || 'Untitled document',
          documentType:
            documentInfo?.type === 'excel' || documentInfo?.type === 'powerpoint'
              ? documentInfo.type
              : 'word',
          mode,
          providerId,
          modelId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create a chat session');
      }

      const session: ChatSession = await response.json();
      setCurrentSession(session);
      return session;
    },
    [currentSession, documentInfo]
  );

  const handleProviderChange = useCallback(
    (providerId: string) => {
      setSelectedProviderId(providerId);
      const providerModel = models.find(
        (model) => model.providerId === providerId && model.enabled
      );
      setSelectedModelId(providerModel?.id ?? '');
    },
    [models]
  );

  const handleInstructionToggle = useCallback((id: string) => {
    setActiveInstructionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!selectedProviderId || !selectedModelId) {
        message.error('Connect a provider and enable at least one model first');
        return;
      }

      setLoading(true);
      let session = currentSession;

      const optimisticUserMessage: ChatMessageType = {
        id: `temp-${Date.now()}`,
        sessionId: currentSession?.id ?? 'pending-session',
        role: 'user',
        content,
        mode: selectedMode,
        modelId: selectedModelId,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMessage]);

      try {
        session = await ensureSession(selectedProviderId, selectedModelId, selectedMode);

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            content,
            mode: selectedMode,
            providerId: selectedProviderId,
            modelId: selectedModelId,
            instructionIds: activeInstructionIds,
            documentContext: documentInfo
              ? {
                  type: documentInfo.type,
                  name: documentInfo.name,
                  content: documentInfo.content,
                }
              : undefined,
          }),
        });

        if (!res.ok) {
          const errorPayload = await res.json().catch(() => null);
          throw new Error(errorPayload?.error || `Chat request failed: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let assistantContent = '';
        const assistantId = `assistant-${Date.now()}`;

        const assistantMessage: ChatMessageType = {
          id: assistantId,
          sessionId: session.id,
          role: 'assistant',
          content: '',
          mode: selectedMode,
          modelId: selectedModelId,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              const chunk = parsed.content || '';
              if (!chunk) continue;

              assistantContent += chunk;
              setMessages((prev) =>
                prev.map((item) =>
                  item.id === assistantId ? { ...item, content: assistantContent } : item
                )
              );
            } catch (error) {
              if (error instanceof Error) {
                throw error;
              }
            }
          }
        }
      } catch (err: unknown) {
        setMessages((prev) => prev.filter((item) => item.id !== optimisticUserMessage.id));
        message.error(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setLoading(false);
      }
    },
    [
      activeInstructionIds,
      currentSession,
      documentInfo,
      ensureSession,
      selectedMode,
      selectedModelId,
      selectedProviderId,
    ]
  );

  const inputDisabled =
    bootstrapping || !selectedProviderId || !selectedModelId || filteredModels.length === 0;

  return (
    <div className="task-pane app-shell">
      <div className="px-3 pb-3 pt-3">
        <div className="panel-card rounded-[28px] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Microsoft Office add-in
              </div>
              <Title level={4} className="!mb-1 !mt-1 !text-slate-900">
                Friendly AI workspace
              </Title>
              <Text className="!text-sm !text-slate-500">
                Ask questions, inspect content, or switch to agent mode when you are ready to edit.
              </Text>
            </div>
            <div className="flex gap-2">
              <Link href="/settings">
                <Button icon={<SettingOutlined />}>Settings</Button>
              </Link>
              <Link href="/history">
                <Button icon={<HistoryOutlined />}>History</Button>
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Card size="small" className="soft-card !bg-white/70">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Mode</div>
              <div className="mt-2 flex items-center gap-2">
                <Tag color={selectedMode === 'ask' ? 'blue' : 'orange'} className="!m-0">
                  {selectedMode === 'ask' ? 'Ask' : 'Agent'}
                </Tag>
                <span className="text-xs text-slate-500">
                  {selectedMode === 'ask' ? 'Read-only guidance' : 'Document-aware editing'}
                </span>
              </div>
            </Card>
            <Card size="small" className="soft-card !bg-white/70">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Session
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <ThunderboltOutlined className="text-amber-500" />
                {currentSession
                  ? `Active · ${relativeTime(currentSession.updatedAt)}`
                  : 'New session starts on first message'}
              </div>
            </Card>
          </div>

          <div className="mt-3">
            <DocumentIndicator documentInfo={documentInfo} />
          </div>
          <div className="mt-3">
            <ModelSelector
              models={models}
              providers={providers}
              selectedModelId={selectedModelId}
              selectedMode={selectedMode}
              selectedProviderId={selectedProviderId}
              onModelChange={setSelectedModelId}
              onModeChange={setSelectedMode}
              onProviderChange={handleProviderChange}
            />
          </div>
          <div className="mt-3">
            <InstructionSelector
              instructions={instructions}
              activeIds={activeInstructionIds}
              onToggle={handleInstructionToggle}
            />
          </div>
        </div>
      </div>

      <div ref={chatScrollRef} className="flex-1 overflow-y-auto chat-scroll px-3 pb-3">
        <div className="soft-card min-h-full rounded-[28px] bg-white/60 px-3 py-3 backdrop-blur">
          {bootstrapping ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Spin />
            </div>
          ) : inputDisabled ? (
            <Alert
              type="info"
              showIcon
              message="Open Settings, connect a provider, fetch its models, and mark at least one model as visible."
            />
          ) : messages.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-500">
                <RobotOutlined />
              </div>
              <div className="text-base font-semibold text-slate-800">Start a conversation</div>
              <div className="mt-2 max-w-[260px] text-sm leading-6 text-slate-500">
                Ask for summaries, inspect formulas, build outlines, or switch to agent mode when you want guided edits.
              </div>
            </div>
          ) : (
            messages.map((item) => <ChatMessage key={item.id} message={item} />)
          )}
        </div>
      </div>

      <ChatInput onSend={sendMessage} loading={loading} disabled={inputDisabled} />
    </div>
  );
}
