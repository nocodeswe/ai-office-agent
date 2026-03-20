'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Spin, message } from 'antd';
import {
  BulbOutlined,
  HistoryOutlined,
  MoonOutlined,
  PlusOutlined,
  RobotOutlined,
  SunOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import DocumentIndicator from '@/components/chat/DocumentIndicator';
import {
  executeOfficeExecutionPlan,
  extractOfficeExecutionPlan,
  shouldConfirmOfficeExecution,
  summarizeOfficeExecution,
} from '@/lib/office/agent-executor';
import type {
  AutoTuneOverrides,
  ChatMessage as ChatMessageType,
  ChatMode,
  ChatSession,
  Model,
  ModelOptimizationGoal,
  ModelTaskIntent,
  Provider,
  UserInstruction,
} from '@/types';

interface DocumentInfo {
  type: string;
  name: string;
  content: string;
}

interface LocalPreferences {
  defaultMode?: ChatMode;
  confirmAgentActions?: boolean;
  rememberDocumentContext?: boolean;
  optimizationGoal?: ModelOptimizationGoal;
  taskIntent?: ModelTaskIntent;
  manualTemperatureOverride?: number;
  manualMaxTokensOverride?: number;
}

function getStoredPreferences(): LocalPreferences {
  try {
    const raw = window.localStorage.getItem('workspace-preferences');
    return raw ? (JSON.parse(raw) as LocalPreferences) : {};
  } catch {
    return {};
  }
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
  const [optimizationGoal, setOptimizationGoal] = useState<ModelOptimizationGoal>('balanced');
  const [taskIntent, setTaskIntent] = useState<ModelTaskIntent>('general');
  const [manualOverrides, setManualOverrides] = useState<AutoTuneOverrides>({});
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [isDark, setIsDark] = useState(true);

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

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('workspace-theme');
    const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextDark = savedTheme ? savedTheme === 'dark' : preferredDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      window.localStorage.setItem('workspace-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const getPreferredModelId = useCallback(
    (provider: Provider | undefined, availableModels: Model[]) => {
      if (selectedModelId && availableModels.some((model) => model.id === selectedModelId)) {
        return selectedModelId;
      }

      const providerDefault = provider?.defaultModel
        ? availableModels.find((model) => model.modelId === provider.defaultModel)
        : null;

      return providerDefault?.id ?? availableModels[0]?.id ?? '';
    },
    [selectedModelId]
  );

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

    const enabledProviders = providersData.filter((provider) => provider.enabled);
    const activeProvider =
      (selectedProviderId
        ? enabledProviders.find((provider) => provider.id === selectedProviderId)
        : null) ?? enabledProviders[0];

    const nextProviderId = activeProvider?.id ?? '';
    setSelectedProviderId(nextProviderId);

    const providerModels = modelsData.filter(
      (model) => model.providerId === nextProviderId && model.enabled
    );
    setSelectedModelId(getPreferredModelId(activeProvider, providerModels));
  }, [getPreferredModelId, selectedProviderId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('workspace-preferences');
      if (!raw) return;
      const preferences = JSON.parse(raw) as LocalPreferences;
      if (preferences.defaultMode) {
        setSelectedMode(preferences.defaultMode);
      }
      if (preferences.optimizationGoal) {
        setOptimizationGoal(preferences.optimizationGoal);
      }
      if (preferences.taskIntent) {
        setTaskIntent(preferences.taskIntent);
      }

      setManualOverrides({
        temperature:
          typeof preferences.manualTemperatureOverride === 'number'
            ? preferences.manualTemperatureOverride
            : undefined,
        maxTokens:
          typeof preferences.manualMaxTokensOverride === 'number'
            ? preferences.manualMaxTokensOverride
            : undefined,
      });
    } catch {
      // ignore invalid local settings
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('workspace-preferences');
      const existing = raw ? (JSON.parse(raw) as LocalPreferences) : {};

      const next: LocalPreferences = {
        ...existing,
        defaultMode: selectedMode,
        optimizationGoal,
        taskIntent,
        manualTemperatureOverride:
          typeof manualOverrides.temperature === 'number'
            ? manualOverrides.temperature
            : undefined,
        manualMaxTokensOverride:
          typeof manualOverrides.maxTokens === 'number'
            ? manualOverrides.maxTokens
            : undefined,
      };

      window.localStorage.setItem('workspace-preferences', JSON.stringify(next));
    } catch {
      // ignore local storage errors
    }
  }, [manualOverrides.maxTokens, manualOverrides.temperature, optimizationGoal, selectedMode, taskIntent]);

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
      const provider = providers.find((item) => item.id === providerId);
      const providerModels = models.filter(
        (model) => model.providerId === providerId && model.enabled
      );
      setSelectedModelId(getPreferredModelId(provider, providerModels));
    },
    [getPreferredModelId, models, providers]
  );

  const handleInstructionToggle = useCallback((id: string) => {
    setActiveInstructionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setCurrentSession(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!selectedProviderId || !selectedModelId) {
        message.error('Connect a provider and enable at least one model first');
        return;
      }

      setLoading(true);
      let session = currentSession;
      let assistantMessageId: string | null = null;
      const preferences = getStoredPreferences();
      const shouldRememberDocumentContext = preferences.rememberDocumentContext !== false;
      const shouldConfirmAgentActions = preferences.confirmAgentActions !== false;
      let activeDocumentInfo = documentInfo;

      if (!shouldRememberDocumentContext) {
        try {
          const { getDocumentInfo } = await import('@/lib/office/context');
          activeDocumentInfo = await getDocumentInfo();
          setDocumentInfo(activeDocumentInfo);
        } catch {
          activeDocumentInfo = documentInfo;
        }
      }

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
        const sessionId = session.id;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            content,
            mode: selectedMode,
            providerId: selectedProviderId,
            modelId: selectedModelId,
            instructionIds: activeInstructionIds,
            autoTune: {
              optimizationGoal,
              taskIntent,
              overrides: manualOverrides,
            },
            documentContext: activeDocumentInfo
              ? {
                  type: activeDocumentInfo.type,
                  name: activeDocumentInfo.name,
                  content: activeDocumentInfo.content,
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
        assistantMessageId = `assistant-${Date.now()}`;

        const assistantMessage: ChatMessageType = {
          id: assistantMessageId,
          sessionId,
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
                  item.id === assistantMessageId ? { ...item, content: assistantContent } : item
                )
              );
            } catch (error) {
              if (error instanceof Error) {
                throw error;
              }
            }
          }
        }

        const { displayContent, plan } = extractOfficeExecutionPlan(assistantContent);

        if (assistantMessageId && displayContent !== assistantContent) {
          setMessages((prev) =>
            prev.map((item) =>
              item.id === assistantMessageId ? { ...item, content: displayContent } : item
            )
          );
        }

        if (selectedMode === 'agent' && plan && session) {
          const requiresConfirmation = shouldConfirmAgentActions || shouldConfirmOfficeExecution(plan);
          const confirmed =
            !requiresConfirmation ||
            window.confirm(
              `${plan.summary}\n\nApply ${plan.operations.length} document operation${
                plan.operations.length === 1 ? '' : 's'
              } now?`
            );

          if (!confirmed) {
            setMessages((prev) => [
              ...prev,
              {
                id: `system-${Date.now()}`,
                sessionId,
                role: 'system',
                content: 'Document changes were prepared but not applied.',
                mode: selectedMode,
                modelId: selectedModelId,
                createdAt: new Date().toISOString(),
              },
            ]);
            return;
          }

          const executionResults = await executeOfficeExecutionPlan(plan);
          const summary = summarizeOfficeExecution(executionResults);

          setMessages((prev) => [
            ...prev,
            {
              id: `system-${Date.now() + 1}`,
              sessionId,
              role: 'system',
              content: summary,
              mode: selectedMode,
              modelId: selectedModelId,
              createdAt: new Date().toISOString(),
            },
          ]);

          const successfulEntries = executionResults.filter((item) => item.success);
          if (successfulEntries.length > 0) {
            await fetch('/api/changelog', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entries: successfulEntries.map((item) => ({
                  sessionId,
                  documentName: activeDocumentInfo?.name || 'Untitled document',
                  operationType: item.operationType,
                  oldValue: item.oldValue,
                  newValue: item.newValue,
                  description: item.description,
                  modelId: selectedModelId,
                })),
              }),
            }).catch(() => undefined);

            try {
              const { getDocumentInfo } = await import('@/lib/office/context');
              const nextDocumentInfo = await getDocumentInfo();
              setDocumentInfo(nextDocumentInfo);
            } catch {
              // Ignore refresh failures after applying operations.
            }
          }
        }
      } catch (err: unknown) {
        setMessages((prev) =>
          prev.filter(
            (item) => item.id !== optimisticUserMessage.id && item.id !== assistantMessageId
          )
        );
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
      manualOverrides,
      optimizationGoal,
      selectedMode,
      selectedModelId,
      selectedProviderId,
      taskIntent,
    ]
  );

  const inputDisabled =
    bootstrapping || !selectedProviderId || !selectedModelId || filteredModels.length === 0;

  const quickPrompts = [
    'Summarize the current document and highlight key risks.',
    'Turn this content into an executive-ready outline.',
    'Review the document and propose the next best actions.',
  ];

  return (
    <div className="task-pane app-shell app-surface h-screen flex flex-col">
      <div className="page-header py-3 px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="font-semibold text-sm">Agent Chat</span>
            <DocumentIndicator documentInfo={documentInfo} />
            {activeInstructionIds.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-300">
                <BulbOutlined />
                {activeInstructionIds.length}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              type="text"
              aria-label="Start new chat"
              icon={<PlusOutlined />}
              onClick={startNewChat}
            >
              <span className="hidden sm:inline">New chat</span>
            </Button>
            <Button
              type="text"
              aria-label="Toggle theme"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
            />
            <Link href="/history">
              <Button type="text" icon={<HistoryOutlined />} />
            </Link>
            <Link href="/settings">
              <Button type="text" icon={<SettingOutlined />} />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto w-full px-4 py-6 chat-scroll">
          {bootstrapping ? (
            <div className="flex min-h-full items-center justify-center">
              <Spin size="large" />
            </div>
          ) : inputDisabled ? (
            <div className="flex min-h-full items-center justify-center">
              <Alert
                type="info"
                showIcon
                message="Open Settings, connect a provider, fetch models, and enable at least one model to start chatting."
              />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center px-4">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center text-xl mb-4">
                <RobotOutlined />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">How can I help you today?</h2>
              <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="p-3 text-left border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => sendMessage(prompt)}
                  >
                    <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">{prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-thread w-full pb-2">
              {messages.map((item) => (
                <ChatMessage key={item.id} message={item} />
              ))}
            </div>
          )}
        </div>

        <div className="w-full px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="w-full">
            <ChatInput
              onSend={sendMessage}
              loading={loading}
              disabled={inputDisabled}
              features={{
                selectedModelId,
                selectedMode,
                selectedProviderId,
                optimizationGoal,
                taskIntent,
                manualOverrides,
                instructions,
                activeInstructionIds,
              }}
              handlers={{
                setSelectedModelId,
                setSelectedMode,
                handleProviderChange,
                setOptimizationGoal,
                setTaskIntent,
                handleInstructionToggle,
              }}
              models={models}
              providers={providers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
