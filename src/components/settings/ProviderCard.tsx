'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Slider,
  Switch,
  Button,
  Tag,
  Space,
  Popconfirm,
  Divider,
  App,
  Alert,
  Typography,
  Select,
  Checkbox,
  Empty,
  Segmented,
} from 'antd';
import {
  ApiOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloudSyncOutlined,
  ThunderboltOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import type { Provider, Model } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { getProviderPreset } from '@/lib/model-catalog';

const { Text } = Typography;

interface ProviderCardProps {
  provider: Provider;
  onUpdate: () => void;
  onDelete: () => void;
}

interface ProviderParameterPreset {
  id: string;
  name: string;
  values: {
    timeout: number;
    retryCount: number;
    maxTokens: number;
    temperature: number;
    autoParameters: boolean;
    defaultModel: string;
  };
  createdAt: string;
}

const PRESET_STORAGE_KEY = 'provider-parameter-presets-v1';

export default function ProviderCard({ provider, onUpdate, onDelete }: ProviderCardProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [savingModels, setSavingModels] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [models, setModels] = useState<Model[] | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [presets, setPresets] = useState<ProviderParameterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presetName, setPresetName] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [modelFilter, setModelFilter] = useState<'all' | 'selected' | 'default'>('all');

  const watchedTemperature =
    (Form.useWatch('temperature', form) as number | undefined) ?? provider.temperature;
  const watchedDefaultModel =
    (Form.useWatch('defaultModel', form) as string | undefined) ?? provider.defaultModel;
  const watchedAutoParameters =
    (Form.useWatch('autoParameters', form) as boolean | undefined) ?? provider.autoParameters;
  const providerPreset = getProviderPreset(provider.type);

  const enabledCount = useMemo(() => selectedModelIds.length, [selectedModelIds]);

  const activeModelPreview = useMemo(() => {
    if (!models?.length) return null;
    return (
      models.find((model) => model.modelId === watchedDefaultModel) ||
      models.find((model) => selectedModelIds.includes(model.modelId)) ||
      models[0]
    );
  }, [models, selectedModelIds, watchedDefaultModel]);

  const sortedModels = useMemo(() => {
    if (!models) return [];

    return [...models].sort((left, right) => {
      const leftScore =
        (left.modelId === watchedDefaultModel ? 4 : 0) +
        (selectedModelIds.includes(left.modelId) ? 2 : 0) +
        (left.profile === 'Deep' ? 1 : 0);
      const rightScore =
        (right.modelId === watchedDefaultModel ? 4 : 0) +
        (selectedModelIds.includes(right.modelId) ? 2 : 0) +
        (right.profile === 'Deep' ? 1 : 0);
      return rightScore - leftScore || left.name.localeCompare(right.name);
    });
  }, [models, selectedModelIds, watchedDefaultModel]);

  const visibleModels = useMemo(() => {
    const normalizedQuery = modelQuery.trim().toLowerCase();

    return sortedModels.filter((model) => {
      const matchesFilter =
        modelFilter === 'all'
          ? true
          : modelFilter === 'selected'
            ? selectedModelIds.includes(model.modelId)
            : watchedDefaultModel === model.modelId;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [model.name, model.modelId, model.description, model.profile]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [modelFilter, modelQuery, selectedModelIds, sortedModels, watchedDefaultModel]);

  const toggleModelSelection = (modelId: string, checked: boolean) => {
    setSelectedModelIds((prev) =>
      checked ? Array.from(new Set([...prev, modelId])) : prev.filter((item) => item !== modelId)
    );
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      const presetMap = raw
        ? (JSON.parse(raw) as Record<string, ProviderParameterPreset[]>)
        : {};
      setPresets(presetMap[provider.id] || []);
      setSelectedPresetId('');
    } catch {
      setPresets([]);
      setSelectedPresetId('');
    }
  }, [provider.id]);

  const persistPresets = (nextPresets: ProviderParameterPreset[]) => {
    setPresets(nextPresets);
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      const presetMap = raw
        ? (JSON.parse(raw) as Record<string, ProviderParameterPreset[]>)
        : {};
      window.localStorage.setItem(
        PRESET_STORAGE_KEY,
        JSON.stringify({
          ...presetMap,
          [provider.id]: nextPresets,
        })
      );
    } catch {
      // ignore local storage errors
    }
  };

  const handleSavePreset = () => {
    const cleanName = presetName.trim();
    if (!cleanName) {
      message.warning('Enter a preset name first');
      return;
    }

    const values = form.getFieldsValue([
      'timeout',
      'retryCount',
      'maxTokens',
      'temperature',
      'autoParameters',
      'defaultModel',
    ]);

    const nextPreset: ProviderParameterPreset = {
      id: `${Date.now()}`,
      name: cleanName,
      createdAt: new Date().toISOString(),
      values: {
        timeout: values.timeout ?? provider.timeout,
        retryCount: values.retryCount ?? provider.retryCount,
        maxTokens: values.maxTokens ?? provider.maxTokens,
        temperature: values.temperature ?? provider.temperature,
        autoParameters: values.autoParameters ?? provider.autoParameters,
        defaultModel: values.defaultModel ?? provider.defaultModel,
      },
    };

    const nextPresets = [nextPreset, ...presets].slice(0, 12);
    persistPresets(nextPresets);
    setPresetName('');
    setSelectedPresetId(nextPreset.id);
    message.success('Preset saved');
  };

  const handleApplyPreset = () => {
    const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
    if (!selectedPreset) {
      message.warning('Choose a preset to apply');
      return;
    }
    form.setFieldsValue(selectedPreset.values);
    message.success('Preset applied');
  };

  const handleDeletePreset = () => {
    if (!selectedPresetId) {
      message.warning('Choose a preset to delete');
      return;
    }

    const nextPresets = presets.filter((preset) => preset.id !== selectedPresetId);
    persistPresets(nextPresets);
    setSelectedPresetId('');
    message.success('Preset removed');
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await res.text());
      message.success('Provider saved');
      onUpdate();
    } catch (err: any) {
      message.error(err?.message || 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await fetch(`/api/providers/${provider.id}/test`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Connection failed');
      }
      message.success('Connection successful');
    } catch (err: any) {
      message.error(err?.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleFetchModels = async () => {
    try {
      setFetchingModels(true);
      const res = await fetch(`/api/providers/${provider.id}/models`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch models');
      const nextModels = data as Model[];
      setModels(nextModels);
      const enabledModelIds = nextModels.filter((model) => model.enabled).map((model) => model.modelId);
      setSelectedModelIds(enabledModelIds);

      const currentDefault = form.getFieldValue('defaultModel') || provider.defaultModel;
      const nextDefault =
        currentDefault && nextModels.some((model) => model.modelId === currentDefault)
          ? currentDefault
          : enabledModelIds[0] || nextModels[0]?.modelId || '';

      if (nextDefault) {
        form.setFieldValue('defaultModel', nextDefault);
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to fetch models');
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSaveModels = async () => {
    try {
      if (!models) return;
      setSavingModels(true);
      const payload = models.map((model) => ({
        modelId: model.modelId,
        name: model.name,
        enabled: selectedModelIds.includes(model.modelId),
      }));
      const res = await fetch(`/api/providers/${provider.id}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: payload }),
      });
      const data: Model[] | { error?: string } = await res.json();
      if (!res.ok) {
        throw new Error('error' in data ? data.error : 'Failed to save models');
      }
      const savedModels = data as Model[];
      setModels(savedModels);

      const currentDefault = form.getFieldValue('defaultModel') || provider.defaultModel;
      const nextDefault =
        currentDefault && selectedModelIds.includes(currentDefault)
          ? currentDefault
          : selectedModelIds[0] || '';
      form.setFieldValue('defaultModel', nextDefault);

      message.success('Models saved');
      if (currentDefault !== nextDefault) {
        message.info('Preferred model changed. Click Save to persist provider settings.');
      }
      onUpdate();
    } catch (err: any) {
      message.error(err?.message || 'Failed to save models');
    } finally {
      setSavingModels(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/providers/${provider.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      message.success('Provider deleted');
      onDelete();
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete provider');
    } finally {
      setDeleting(false);
    }
  };

  const applyRecommendedParameters = () => {
    if (!activeModelPreview?.recommendedParameters) return;
    form.setFieldsValue({
      temperature: activeModelPreview.recommendedParameters.temperature,
      maxTokens: activeModelPreview.recommendedParameters.maxTokens,
    });
    message.success('Recommended parameters applied');
  };

  return (
    <Card
      size="small"
      className="soft-card mb-4 overflow-hidden"
      title={
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{provider.name}</span>
          <Tag color="geekblue" className="!m-0 capitalize">
            {provider.type}
          </Tag>
        </div>
      }
      extra={
        <Form.Item noStyle valuePropName="checked">
          <Switch
            size="small"
            defaultChecked={provider.enabled}
            onChange={(checked) => form.setFieldsValue({ enabled: checked })}
          />
        </Form.Item>
      }
    >
      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <div className="setting-item">
          <div className="metric-card__label">Status</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${provider.enabled ? 'bg-emerald-500' : 'bg-slate-500'}`}
            />
            {provider.enabled ? 'Enabled in chat' : 'Disabled'}
          </div>
        </div>
        <div className="setting-item">
          <div className="metric-card__label">Visible models</div>
          <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{enabledCount}</div>
        </div>
        <div className="setting-item">
          <div className="metric-card__label">Parameter strategy</div>
          <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            {watchedAutoParameters ? 'Automatic by model' : 'Manual provider defaults'}
          </div>
        </div>
      </div>

      <div className="provider-preset mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{providerPreset.label}</div>
            <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{providerPreset.description}</div>
          </div>
          <Tag color={provider.enabled ? 'green' : 'default'} className="!m-0">
            {provider.enabled ? 'Live' : 'Paused'}
          </Tag>
        </div>
        <div className="mt-3 inline-chip-row">
          {providerPreset.strengths.map((strength) => (
            <span key={strength} className="inline-chip">
              {strength}
            </span>
          ))}
        </div>
      </div>

      <div className="provider-preset mb-4">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Parameter presets</div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Save reusable parameter bundles to switch quickly between speed, quality, and custom workflows.
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr),auto,auto]">
          <Select
            allowClear
            placeholder={presets.length ? 'Choose saved preset' : 'No saved presets yet'}
            value={selectedPresetId || undefined}
            onChange={(value) => setSelectedPresetId(value || '')}
            options={presets.map((preset) => ({
              value: preset.id,
              label: `${preset.name} · ${new Date(preset.createdAt).toLocaleDateString()}`,
            }))}
          />
          <Button onClick={handleApplyPreset}>Apply</Button>
          <Button danger onClick={handleDeletePreset}>Delete</Button>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr),auto]">
          <Input
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Preset name (e.g. Analysis quality)"
          />
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSavePreset}>
            Save preset
          </Button>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        size="small"
        initialValues={{
          apiBaseUrl: provider.apiBaseUrl,
          apiKey: provider.apiKey,
          defaultModel: provider.defaultModel,
          autoParameters: provider.autoParameters,
          timeout: provider.timeout,
          retryCount: provider.retryCount,
          maxTokens: provider.maxTokens,
          temperature: provider.temperature,
          enabled: provider.enabled,
        }}
        className="[&_.ant-form-item]:mb-3"
      >
        <Form.Item name="enabled" hidden>
          <Input />
        </Form.Item>

        <div className="grid gap-2 md:grid-cols-2">
          <Form.Item label="API Base URL" name="apiBaseUrl">
            <Input placeholder={providerPreset.baseUrl} />
          </Form.Item>

          <Form.Item label="API Key" name="apiKey">
            <Input.Password placeholder={provider.type === 'ollama' ? 'Optional token' : 'sk-...'} />
          </Form.Item>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Form.Item label="Preferred model" name="defaultModel">
            {models ? (
              <Select
                allowClear
                showSearch
                placeholder="Choose default model"
                optionFilterProp="label"
                options={models.map((model) => ({
                  value: model.modelId,
                  label: model.name,
                }))}
              />
            ) : (
              <Input placeholder="gpt-5-mini / claude-sonnet / gemini-2.5-pro" />
            )}
          </Form.Item>

          <div className="setting-item">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Auto-tune model parameters</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Use recommended token and temperature values based on the chosen model.
                </div>
              </div>
              <Form.Item name="autoParameters" valuePropName="checked" className="!mb-0">
                <Switch size="small" />
              </Form.Item>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Form.Item label="Timeout (ms)" name="timeout">
            <InputNumber min={1000} step={1000} className="w-full" />
          </Form.Item>
          <Form.Item label="Retries" name="retryCount">
            <InputNumber min={0} max={10} className="w-full" />
          </Form.Item>
          <Form.Item label="Max tokens fallback" name="maxTokens">
            <InputNumber min={256} step={256} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item label={`Temperature fallback · ${watchedTemperature.toFixed(1)}`} name="temperature">
          <Slider min={0} max={2} step={0.1} />
        </Form.Item>
      </Form>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-400">
        <div>Created: {formatDateTime(provider.createdAt)}</div>
        <div>Last updated: {formatDateTime(provider.updatedAt)}</div>
        <div className="truncate">Endpoint: {provider.apiBaseUrl || providerPreset.baseUrl}</div>
      </div>

      {activeModelPreview ? (
        <div className="model-card mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <RocketOutlined className="text-sky-300" />
                Recommended setup preview
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {activeModelPreview.name} · {activeModelPreview.description}
              </div>
            </div>
            {activeModelPreview.profile ? <Tag className="!m-0">{activeModelPreview.profile}</Tag> : null}
          </div>

          <div className="mt-3 inline-chip-row">
            {(activeModelPreview.capabilities || []).map((capability) => (
              <span key={capability} className="capability-chip">
                {capability}
              </span>
            ))}
          </div>

          {(activeModelPreview.bestFor || []).length ? (
            <div className="mt-3 inline-chip-row">
              {(activeModelPreview.bestFor || []).map((item) => (
                <span key={item} className="inline-chip">
                  Use case · {item}
                </span>
              ))}
            </div>
          ) : null}

          {(activeModelPreview.limitations || []).length ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
              {(activeModelPreview.limitations || []).map((limitation) => (
                <span
                  key={limitation}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  Limit · {limitation}
                </span>
              ))}
            </div>
          ) : null}

          {activeModelPreview.recommendedParameters ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:border-white/5 dark:bg-black/20 dark:text-slate-300">
              <div>Temperature · {activeModelPreview.recommendedParameters.temperature}</div>
              <div className="mt-1">Max tokens · {activeModelPreview.recommendedParameters.maxTokens}</div>
              <div className="mt-2 text-slate-500">{activeModelPreview.recommendedParameters.note}</div>
            </div>
          ) : null}

          {!watchedAutoParameters && activeModelPreview.recommendedParameters ? (
            <Button className="mt-3" icon={<ThunderboltOutlined />} onClick={applyRecommendedParameters}>
              Apply recommended values
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="model-card mb-4 text-sm text-slate-600 dark:text-slate-400">
          Fetch models to see richer descriptions, capabilities, and recommended defaults.
        </div>
      )}

      <Space wrap size={[8, 8]} className="w-full">
        <Button icon={<ApiOutlined />} loading={testing} onClick={handleTest}>
          Test connection
        </Button>
        <Button icon={<CloudSyncOutlined />} loading={fetchingModels} onClick={handleFetchModels}>
          Fetch models
        </Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          Save provider
        </Button>
        <Popconfirm
          title="Delete this provider?"
          onConfirm={handleDelete}
          okText="Yes"
          cancelText="No"
        >
          <Button danger icon={<DeleteOutlined />} loading={deleting}>
            Delete
          </Button>
        </Popconfirm>
      </Space>

      <Divider className="my-4" />

      {models ? (
        <>
          <Alert
            type="info"
            showIcon
            className="mb-3"
            message="Choose which models appear in chat and mark one as the preferred default."
          />

          <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(0,1fr),220px,auto,auto]">
            <Input
              value={modelQuery}
              onChange={(event) => setModelQuery(event.target.value)}
              placeholder="Search by name, id, or profile"
            />
            <Segmented
              block
              value={modelFilter}
              onChange={(value) => setModelFilter(value as 'all' | 'selected' | 'default')}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Selected', value: 'selected' },
                { label: 'Default', value: 'default' },
              ]}
            />
            <Button onClick={() => setSelectedModelIds(sortedModels.map((model) => model.modelId))}>
              Select all
            </Button>
            <Button onClick={() => setSelectedModelIds([])}>Clear</Button>
          </div>

          <div className="max-h-[520px] space-y-2 overflow-y-auto chat-scroll pr-1">
            {visibleModels.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 dark:border-white/10">
                <Empty description="No models match the current filter" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : null}

            {visibleModels.map((model) => {
              const enabled = selectedModelIds.includes(model.modelId);
              const isDefault = watchedDefaultModel === model.modelId;
              const capabilityPreview = (model.capabilities || []).slice(0, 3);
              const remainingCapabilities = Math.max((model.capabilities || []).length - capabilityPreview.length, 0);

              return (
                <div
                  key={model.modelId}
                  className={`model-card ${enabled ? 'model-card--active' : ''}`}
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),auto]">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Checkbox checked={enabled} onChange={(event) => toggleModelSelection(model.modelId, event.target.checked)}>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{model.name}</span>
                        </Checkbox>
                        {model.profile ? <Tag className="!m-0">{model.profile}</Tag> : null}
                        {isDefault ? (
                          <Tag color="gold" className="!m-0">
                            Default
                          </Tag>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{model.description || model.modelId}</div>
                      <div className="mt-3 inline-chip-row">
                        {capabilityPreview.map((capability) => (
                          <span key={capability} className="capability-chip">
                            {capability}
                          </span>
                        ))}
                        {remainingCapabilities > 0 ? <span className="inline-chip">+{remainingCapabilities} more</span> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>ID · {model.modelId}</span>
                        {model.contextWindow ? <span>Context · {model.contextWindow}</span> : null}
                        {model.recommendedParameters ? (
                          <span>
                            Recommended · {model.recommendedParameters.temperature} / {model.recommendedParameters.maxTokens}
                          </span>
                        ) : null}
                      </div>

                      {(model.bestFor || []).length ? (
                        <div className="mt-3 inline-chip-row">
                          {(model.bestFor || []).slice(0, 3).map((item) => (
                            <span key={item} className="inline-chip">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}

                    </div>

                    <div className="flex flex-row items-start justify-between gap-2 lg:flex-col lg:items-end">
                      <Switch
                        size="small"
                        checked={enabled}
                        onChange={(checked) => toggleModelSelection(model.modelId, checked)}
                      />
                      <Button
                        size="small"
                        type={isDefault ? 'primary' : 'default'}
                        disabled={!enabled}
                        onClick={() => form.setFieldValue('defaultModel', model.modelId)}
                      >
                        {isDefault ? 'Preferred' : 'Set default'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <Text className="!text-xs !text-slate-500">{enabledCount} models selected for chat · {visibleModels.length} shown</Text>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={savingModels}
              onClick={handleSaveModels}
            >
              Save model visibility
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
          Fetch models to browse descriptions, capabilities, and recommended defaults for this provider.
        </div>
      )}
    </Card>
  );
}
