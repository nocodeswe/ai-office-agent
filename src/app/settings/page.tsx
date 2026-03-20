'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs,
  Spin,
  App,
  Card,
  Segmented,
  Switch,
  Tag,
  Typography,
  Empty,
  Button,
  InputNumber,
} from 'antd';
import {
  LeftOutlined,
  ApiOutlined,
  BulbOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type {
  ChatMode,
  ModelOptimizationGoal,
  ModelTaskIntent,
  Provider,
  UserInstruction,
} from '@/types';
import AddProviderForm from '@/components/settings/AddProviderForm';
import ProviderCard from '@/components/settings/ProviderCard';
import InstructionEditor from '@/components/settings/InstructionEditor';

const { Text } = Typography;

interface LocalPreferences {
  defaultMode: ChatMode;
  enableStreaming: boolean;
  confirmAgentActions: boolean;
  rememberDocumentContext: boolean;
  optimizationGoal: ModelOptimizationGoal;
  taskIntent: ModelTaskIntent;
  manualTemperatureOverride?: number;
  manualMaxTokensOverride?: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [instructions, setInstructions] = useState<UserInstruction[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingInstructions, setLoadingInstructions] = useState(true);
  const [preferences, setPreferences] = useState<LocalPreferences>({
    defaultMode: 'ask',
    enableStreaming: true,
    confirmAgentActions: true,
    rememberDocumentContext: true,
    optimizationGoal: 'balanced',
    taskIntent: 'general',
    manualTemperatureOverride: undefined,
    manualMaxTokensOverride: undefined,
  });

  const fetchProviders = useCallback(async () => {
    try {
      setLoadingProviders(true);
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to load providers');
      setProviders(await res.json());
    } catch (err: any) {
      message.error(err?.message || 'Failed to load providers');
    } finally {
      setLoadingProviders(false);
    }
  }, [message]);

  const fetchInstructions = useCallback(async () => {
    try {
      setLoadingInstructions(true);
      const res = await fetch('/api/instructions');
      if (!res.ok) throw new Error('Failed to load instructions');
      setInstructions(await res.json());
    } catch (err: any) {
      message.error(err?.message || 'Failed to load instructions');
    } finally {
      setLoadingInstructions(false);
    }
  }, [message]);

  useEffect(() => {
    fetchProviders();
    fetchInstructions();
  }, [fetchProviders, fetchInstructions]);

  useEffect(() => {
    const raw = window.localStorage.getItem('workspace-preferences');
    if (!raw) return;
    try {
      setPreferences((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      // ignore invalid local preferences
    }
  }, []);

  const updatePreferences = useCallback((patch: Partial<LocalPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem('workspace-preferences', JSON.stringify(next));
      return next;
    });
  }, []);

  const enabledProviders = useMemo(
    () => providers.filter((provider) => provider.enabled),
    [providers]
  );

  const providerStats = useMemo(
    () => ({
      total: providers.length,
      enabled: enabledProviders.length,
      autoParameters: enabledProviders.filter((provider) => provider.autoParameters).length,
      instructions: instructions.length,
      activeInstructions: instructions.filter((instruction) => instruction.enabled).length,
    }),
    [enabledProviders, instructions, providers.length]
  );

  return (
    <div className="task-pane app-shell app-surface">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <Button icon={<LeftOutlined />} onClick={() => router.push('/')} />
          <div className="min-w-0">
            <div className="page-header__eyebrow">Workspace setup</div>
            <div className="page-header__title">Models, providers, and instructions</div>
            <div className="page-header__subtitle">
              Configure connections, browse model capabilities, and choose whether parameters stay manual or adapt automatically per model.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto chat-scroll px-4 pb-4">
        <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-[320px,minmax(0,1fr)]">
          <div className="space-y-4">
            <Card size="small" className="soft-card">
              <div className="grid grid-cols-2 gap-3">
                <div className="setting-item">
                  <div className="metric-card__label">Providers</div>
                  <div className="metric-card__value">{providerStats.enabled}</div>
                  <div className="metric-card__hint">{providerStats.total} configured</div>
                </div>
                <div className="setting-item">
                  <div className="metric-card__label">Auto params</div>
                  <div className="metric-card__value">{providerStats.autoParameters}</div>
                  <div className="metric-card__hint">enabled providers</div>
                </div>
                <div className="setting-item">
                  <div className="metric-card__label">Instructions</div>
                  <div className="metric-card__value">{providerStats.activeInstructions}</div>
                  <div className="metric-card__hint">{providerStats.instructions} total layers</div>
                </div>
                <div className="setting-item">
                  <div className="metric-card__label">Chat default</div>
                  <div className="metric-card__value text-2xl">{preferences.defaultMode === 'agent' ? 'Agent' : 'Ask'}</div>
                  <div className="metric-card__hint">new conversations</div>
                </div>
              </div>
            </Card>

            <Card
              size="small"
              className="soft-card"
              title={
                <div className="flex items-center gap-2">
                  <RobotOutlined />
                  <span>Workspace defaults</span>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="setting-item flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Default chat mode</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Choose how new chats should start.</div>
                  </div>
                  <Segmented
                    size="small"
                    value={preferences.defaultMode}
                    onChange={(value) => updatePreferences({ defaultMode: value as ChatMode })}
                    options={[
                      { label: 'Ask', value: 'ask' },
                      { label: 'Agent', value: 'agent' },
                    ]}
                  />
                </div>

                <div className="setting-item flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Streaming responses</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Render output live while the model responds.</div>
                  </div>
                  <Switch
                    size="small"
                    checked={preferences.enableStreaming}
                    onChange={(checked) => updatePreferences({ enableStreaming: checked })}
                  />
                </div>

                <div className="setting-item flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Confirm agent edits</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Keep a safer review step before edits are applied.</div>
                  </div>
                  <Switch
                    size="small"
                    checked={preferences.confirmAgentActions}
                    onChange={(checked) => updatePreferences({ confirmAgentActions: checked })}
                  />
                </div>

                <div className="setting-item flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Remember document context</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Reuse document details between quick follow-up prompts.</div>
                  </div>
                  <Switch
                    size="small"
                    checked={preferences.rememberDocumentContext}
                    onChange={(checked) => updatePreferences({ rememberDocumentContext: checked })}
                  />
                </div>

                <div className="setting-item flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Auto-tune goal</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Choose whether model auto-parameters prioritize speed, balance, or quality.
                    </div>
                  </div>
                  <Segmented
                    size="small"
                    value={preferences.optimizationGoal}
                    onChange={(value) =>
                      updatePreferences({ optimizationGoal: value as ModelOptimizationGoal })
                    }
                    options={[
                      { label: 'Speed', value: 'speed' },
                      { label: 'Balance', value: 'balanced' },
                      { label: 'Quality', value: 'quality' },
                    ]}
                  />
                </div>

                <div className="setting-item flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Task intent</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Help auto-tuning adapt to analysis, writing, coding, or general requests.
                    </div>
                  </div>
                  <Segmented
                    size="small"
                    value={preferences.taskIntent}
                    onChange={(value) => updatePreferences({ taskIntent: value as ModelTaskIntent })}
                    options={[
                      { label: 'General', value: 'general' },
                      { label: 'Analysis', value: 'analysis' },
                      { label: 'Writing', value: 'writing' },
                      { label: 'Coding', value: 'coding' },
                    ]}
                  />
                </div>

                <div className="setting-item space-y-3">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Manual corrections over auto</div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Temperature override (optional)
                    </div>
                    <Switch
                      size="small"
                      checked={typeof preferences.manualTemperatureOverride === 'number'}
                      onChange={(checked) =>
                        updatePreferences({
                          manualTemperatureOverride: checked
                            ? (preferences.manualTemperatureOverride ?? 0.3)
                            : undefined,
                        })
                      }
                    />
                  </div>

                  {typeof preferences.manualTemperatureOverride === 'number' ? (
                    <InputNumber
                      min={0}
                      max={2}
                      step={0.1}
                      value={preferences.manualTemperatureOverride}
                      onChange={(value) =>
                        updatePreferences({
                          manualTemperatureOverride:
                            typeof value === 'number' ? value : preferences.manualTemperatureOverride,
                        })
                      }
                      className="w-full"
                    />
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Max tokens override (optional)
                    </div>
                    <Switch
                      size="small"
                      checked={typeof preferences.manualMaxTokensOverride === 'number'}
                      onChange={(checked) =>
                        updatePreferences({
                          manualMaxTokensOverride: checked
                            ? (preferences.manualMaxTokensOverride ?? 4096)
                            : undefined,
                        })
                      }
                    />
                  </div>

                  {typeof preferences.manualMaxTokensOverride === 'number' ? (
                    <InputNumber
                      min={256}
                      step={256}
                      value={preferences.manualMaxTokensOverride}
                      onChange={(value) =>
                        updatePreferences({
                          manualMaxTokensOverride:
                            typeof value === 'number' ? value : preferences.manualMaxTokensOverride,
                        })
                      }
                      className="w-full"
                    />
                  ) : null}
                </div>
              </div>
            </Card>

            <AddProviderForm onAdded={fetchProviders} />
          </div>

          <div className="space-y-4">
            <Tabs
              defaultActiveKey="providers"
              items={[
                {
                  key: 'providers',
                  label: 'Providers & models',
                  children: (
                    <Spin spinning={loadingProviders}>
                      <Card size="small" className="soft-card mb-4">
                        <div className="flex items-start gap-3">
                          <ApiOutlined className="mt-1 text-sky-300" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Connection overview</div>
                            <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                              Fetch provider models to unlock descriptions, capability tags, and recommended parameter presets. Preferred models influence chat defaults, and automatic parameters follow the chosen model at runtime.
                            </div>
                            <div className="mt-3 inline-chip-row">
                              <span className="inline-chip">{enabledProviders.length} enabled providers</span>
                              <span className="inline-chip">{providerStats.autoParameters} using auto tuning</span>
                              <span className="inline-chip">History + settings stay accessible from chat header</span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {providers.length === 0 ? (
                        <Card size="small" className="soft-card">
                          <Empty description="No providers connected yet" />
                        </Card>
                      ) : (
                        providers.map((provider) => (
                          <ProviderCard
                            key={provider.id}
                            provider={provider}
                            onUpdate={fetchProviders}
                            onDelete={fetchProviders}
                          />
                        ))
                      )}
                    </Spin>
                  ),
                },
                {
                  key: 'instructions',
                  label: 'Prompt layers',
                  children: (
                    <Spin spinning={loadingInstructions}>
                      <Card size="small" className="soft-card mb-4">
                        <div className="flex items-start gap-3">
                          <BulbOutlined className="mt-1 text-amber-300" />
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Instruction strategy</div>
                            <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                              Keep instructions short, scoped, and purposeful. These layers are now surfaced directly near the composer in chat, so users can activate them contextually instead of hunting through settings.
                            </div>
                            <div className="mt-3 inline-chip-row">
                              <Tag color="purple" className="!m-0">
                                {providerStats.activeInstructions}/{providerStats.instructions} enabled
                              </Tag>
                              <Tag color="blue" className="!m-0">
                                Composer-first UX
                              </Tag>
                            </div>
                          </div>
                        </div>
                      </Card>

                      <InstructionEditor
                        instructions={instructions}
                        onRefresh={fetchInstructions}
                      />
                    </Spin>
                  ),
                },
              ]}
            />

            <Card size="small" className="soft-card">
              <div className="flex items-start gap-3">
                <ThunderboltOutlined className="mt-1 text-sky-300" />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">What changed in the redesign</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    The chat surface now behaves like a modern agent workspace: cleaner header, full-height conversation area, model/agent controls next to the input, richer model descriptions, and optional automatic tuning based on the selected model.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
