'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs,
  Spin,
  Divider,
  App,
  Card,
  Segmented,
  Switch,
  Tag,
  Typography,
} from 'antd';
import {
  LeftOutlined,
  ApiOutlined,
  BulbOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { ChatMode, Provider, UserInstruction } from '@/types';
import { formatDateTime } from '@/lib/utils';
import AddProviderForm from '@/components/settings/AddProviderForm';
import ProviderCard from '@/components/settings/ProviderCard';
import InstructionEditor from '@/components/settings/InstructionEditor';

const { Text } = Typography;

interface LocalPreferences {
  defaultMode: ChatMode;
  enableStreaming: boolean;
  confirmAgentActions: boolean;
  rememberDocumentContext: boolean;
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
      instructions: instructions.length,
      activeInstructions: instructions.filter((instruction) => instruction.enabled).length,
    }),
    [enabledProviders.length, instructions, providers.length]
  );

  return (
    <div className="task-pane app-shell">
      <div className="px-3 pb-3 pt-3">
        <div className="panel-card flex items-start gap-3 rounded-[24px] px-4 py-4">
          <button
            onClick={() => router.push('/')}
            className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[var(--foreground)] shadow-sm transition hover:text-[var(--primary)]"
            type="button"
          >
            <LeftOutlined style={{ fontSize: 14 }} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Workspace
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              Settings & provider control
            </div>
            <Text className="mt-1 block !text-xs !text-slate-500">
              Manage providers, visible models, instruction sets, and task-pane behavior.
            </Text>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto chat-scroll px-3 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <Card size="small" className="soft-card">
            <Text className="!text-[11px] !uppercase !tracking-[0.2em] !text-slate-400">
              Providers
            </Text>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-2xl font-semibold text-slate-900">{providerStats.enabled}</div>
              <Tag color="blue">{providerStats.total} total</Tag>
            </div>
          </Card>
          <Card size="small" className="soft-card">
            <Text className="!text-[11px] !uppercase !tracking-[0.2em] !text-slate-400">
              Instructions
            </Text>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-2xl font-semibold text-slate-900">
                {providerStats.activeInstructions}
              </div>
              <Tag color="purple">{providerStats.instructions} total</Tag>
            </div>
          </Card>
        </div>

        <Card
          size="small"
          className="soft-card mt-3"
          title={
            <div className="flex items-center gap-2">
              <RobotOutlined />
              <span>Workspace preferences</span>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-800">Default mode</div>
                <div className="text-xs text-slate-500">Choose how new chats start by default.</div>
              </div>
              <Segmented
                size="small"
                value={preferences.defaultMode}
                onChange={(value) =>
                  updatePreferences({ defaultMode: value as ChatMode })
                }
                options={[
                  { label: 'Ask', value: 'ask' },
                  { label: 'Agent', value: 'agent' },
                ]}
              />
            </div>
            <div className="settings-toggle-row">
              <div>
                <div className="text-sm font-medium text-slate-800">Streaming responses</div>
                <div className="text-xs text-slate-500">Render answers live while tokens arrive.</div>
              </div>
              <Switch
                size="small"
                checked={preferences.enableStreaming}
                onChange={(checked) => updatePreferences({ enableStreaming: checked })}
              />
            </div>
            <div className="settings-toggle-row">
              <div>
                <div className="text-sm font-medium text-slate-800">Confirm agent edits</div>
                <div className="text-xs text-slate-500">
                  Keep a safer flow before applying document changes.
                </div>
              </div>
              <Switch
                size="small"
                checked={preferences.confirmAgentActions}
                onChange={(checked) =>
                  updatePreferences({ confirmAgentActions: checked })
                }
              />
            </div>
            <div className="settings-toggle-row">
              <div>
                <div className="text-sm font-medium text-slate-800">Remember document context</div>
                <div className="text-xs text-slate-500">
                  Reuse current document details between quick follow-ups.
                </div>
              </div>
              <Switch
                size="small"
                checked={preferences.rememberDocumentContext}
                onChange={(checked) =>
                  updatePreferences({ rememberDocumentContext: checked })
                }
              />
            </div>
          </div>
        </Card>

        <Tabs
          size="small"
          defaultActiveKey="providers"
          className="mt-3"
          items={[
            {
              key: 'providers',
              label: 'Providers',
              children: (
                <Spin spinning={loadingProviders}>
                  <Card size="small" className="soft-card mb-3">
                    <div className="flex items-start gap-2">
                      <ApiOutlined className="mt-1 text-sky-500" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800">
                          Connected provider overview
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          Enabled providers appear in chat. Fetch each provider’s models and choose
                          which ones should be visible to users.
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>{enabledProviders.length} enabled</span>
                          <span>•</span>
                          <span>{providers.length} configured</span>
                          <span>•</span>
                          <span>
                            Last sync hint: {providers[0] ? formatDateTime(providers[0].updatedAt) : 'No providers yet'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                  <AddProviderForm onAdded={fetchProviders} />
                  {providers.length > 0 && <Divider className="my-3" />}
                  {providers.map((p) => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      onUpdate={fetchProviders}
                      onDelete={fetchProviders}
                    />
                  ))}
                </Spin>
              ),
            },
            {
              key: 'instructions',
              label: 'Instructions',
              children: (
                <Spin spinning={loadingInstructions}>
                  <Card size="small" className="soft-card mb-3">
                    <div className="flex items-start gap-2">
                      <BulbOutlined className="mt-1 text-amber-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          Prompt layers
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          Instructions are merged into the system prompt and can be scoped to a
                          document, mode, or provider. Higher priority instructions should be more
                          specific and concise.
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
      </div>
    </div>
  );
}
