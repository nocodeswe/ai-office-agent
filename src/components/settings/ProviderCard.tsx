'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Slider,
  Switch,
  Button,
  Tag,
  Checkbox,
  Space,
  Popconfirm,
  Divider,
  App,
  Alert,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloudSyncOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { Provider, Model, ProviderType } from '@/types';
import { formatDateTime } from '@/lib/utils';

const { Text } = Typography;

const typeColors: Record<ProviderType, string> = {
  openai: 'green',
  claude: 'orange',
  gemini: 'blue',
  ollama: 'purple',
  nvidia: 'lime',
};

interface ProviderCardProps {
  provider: Provider;
  onUpdate: () => void;
  onDelete: () => void;
}

interface RemoteModelOption {
  modelId: string;
  name: string;
  enabled: boolean;
}

export default function ProviderCard({ provider, onUpdate, onDelete }: ProviderCardProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [savingModels, setSavingModels] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [models, setModels] = useState<RemoteModelOption[] | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  const enabledCount = useMemo(
    () => selectedModelIds.length,
    [selectedModelIds]
  );

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
      setModels(data);
      setSelectedModelIds(data.filter((m: RemoteModelOption) => m.enabled).map((m: RemoteModelOption) => m.modelId));
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
      const payload = models.map((m) => ({
        modelId: m.modelId,
        name: m.name,
        enabled: selectedModelIds.includes(m.modelId),
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
      setModels(
        (data as Model[]).map((model) => ({
          modelId: model.modelId,
          name: model.name,
          enabled: model.enabled,
        }))
      );
      message.success('Models saved');
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

  return (
    <Card
      size="small"
      className="soft-card mb-3 overflow-hidden"
      title={
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{provider.name}</span>
          <Tag color={typeColors[provider.type]} className="text-xs">
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
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Status</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${provider.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
            />
            {provider.enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Visible models</div>
          <div className="mt-1 text-sm font-medium text-slate-700">{enabledCount}</div>
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
          timeout: provider.timeout,
          retryCount: provider.retryCount,
          maxTokens: provider.maxTokens,
          temperature: provider.temperature,
          enabled: provider.enabled,
        }}
        className="[&_.ant-form-item]:mb-2"
      >
        <Form.Item name="enabled" hidden>
          <Input />
        </Form.Item>

        <Form.Item label="API Base URL" name="apiBaseUrl">
          <Input placeholder="https://..." />
        </Form.Item>

        <Form.Item label="API Key" name="apiKey">
          <Input.Password placeholder="sk-..." />
        </Form.Item>

        <div className="grid grid-cols-3 gap-2">
          <Form.Item label="Timeout (ms)" name="timeout">
            <InputNumber min={0} step={1000} className="w-full" />
          </Form.Item>
          <Form.Item label="Retries" name="retryCount">
            <InputNumber min={0} max={10} className="w-full" />
          </Form.Item>
          <Form.Item label="Max Tokens" name="maxTokens">
            <InputNumber min={1} step={256} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item label={`Temperature: ${form.getFieldValue('temperature') ?? provider.temperature}`} name="temperature">
          <Slider min={0} max={2} step={0.1} />
        </Form.Item>

        <div className="grid grid-cols-1 gap-2">
          <Form.Item label="Default Model ID" name="defaultModel">
            <Input placeholder="gpt-4o-mini / claude-3-5-sonnet / llama3.1" />
          </Form.Item>
        </div>
      </Form>

      <div className="mb-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <div>Created: {formatDateTime(provider.createdAt)}</div>
        <div>Last updated: {formatDateTime(provider.updatedAt)}</div>
        <div className="truncate">Endpoint: {provider.apiBaseUrl || 'Default provider endpoint'}</div>
      </div>

      <Space wrap size={[6, 6]} className="w-full">
        <Button
          size="small"
          icon={<ApiOutlined />}
          loading={testing}
          onClick={handleTest}
        >
          Test
        </Button>
        <Button
          size="small"
          icon={<CloudSyncOutlined />}
          loading={fetchingModels}
          onClick={handleFetchModels}
        >
          Models
        </Button>
        <Button
          size="small"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
        >
          Save
        </Button>
        <Popconfirm
          title="Delete this provider?"
          onConfirm={handleDelete}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
          >
            Delete
          </Button>
        </Popconfirm>
      </Space>

      {models && (
        <>
          <Divider className="my-3" />
          <Alert
            type="info"
            showIcon
            className="mb-3"
            message="Choose which fetched models should appear in the chat selector."
          />
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-medium">Model Visibility</div>
            <Text className="!text-xs !text-slate-500">{enabledCount} selected</Text>
          </div>
          <div className="max-h-40 overflow-y-auto">
            <Checkbox.Group
              value={selectedModelIds}
              onChange={(vals) => setSelectedModelIds(vals as string[])}
              className="flex flex-col gap-1"
            >
              {models.map((m) => (
                <Checkbox key={m.modelId} value={m.modelId} className="text-xs">
                  {m.name || m.modelId}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </div>
          <Button
            size="small"
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={savingModels}
            onClick={handleSaveModels}
            className="mt-2"
          >
            Save Models
          </Button>
        </>
      )}
    </Card>
  );
}
