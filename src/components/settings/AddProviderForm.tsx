'use client';

import { useState } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  App,
  InputNumber,
  Switch,
  Typography,
} from 'antd';
import { PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { ProviderType } from '@/types';

const { Text } = Typography;

const defaultBaseUrls: Record<ProviderType, string> = {
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://localhost:11434',
  nvidia: 'https://integrate.api.nvidia.com/v1',
};

const providerTypes: { label: string; value: ProviderType }[] = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Claude', value: 'claude' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'Ollama', value: 'ollama' },
  { label: 'NVIDIA', value: 'nvidia' },
];

interface AddProviderFormProps {
  onAdded: () => void;
}

export default function AddProviderForm({ onAdded }: AddProviderFormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const selectedType = Form.useWatch('type', form) as ProviderType | undefined;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        ...values,
        apiBaseUrl: values.apiBaseUrl || defaultBaseUrls[values.type as ProviderType],
      };
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      message.success('Provider added');
      form.resetFields();
      onAdded();
    } catch (err: any) {
      if (err?.errorFields) return; // validation error
      message.error(err?.message || 'Failed to add provider');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card size="small" title="Add Provider" className="mb-3">
      <div className="mb-3 rounded-2xl bg-slate-50 px-3 py-2">
        <div className="flex items-start gap-2">
          <SafetyCertificateOutlined className="mt-1 text-emerald-500" />
          <div>
            <div className="text-sm font-medium text-slate-800">Quick setup</div>
            <Text className="!text-xs !text-slate-500">
              Add a provider, verify connectivity, then fetch models and choose which ones appear in chat.
            </Text>
          </div>
        </div>
      </div>
      <Form
        form={form}
        layout="vertical"
        size="small"
        initialValues={{
          enabled: true,
          timeout: 30000,
          retryCount: 3,
          maxTokens: 4096,
          temperature: 0.7,
        }}
        className="[&_.ant-form-item]:mb-2"
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input placeholder="My Provider" />
        </Form.Item>

        <Form.Item
          label="Type"
          name="type"
          rules={[{ required: true, message: 'Type is required' }]}
        >
          <Select
            placeholder="Select type"
            options={providerTypes}
            onChange={() => form.setFieldsValue({ apiBaseUrl: undefined })}
          />
        </Form.Item>

        <Form.Item label="API Base URL" name="apiBaseUrl">
          <Input
            placeholder={
              selectedType ? defaultBaseUrls[selectedType] : 'https://...'
            }
          />
        </Form.Item>

        <Form.Item
          label="API Key"
          name="apiKey"
          rules={[
            {
              required: selectedType !== 'ollama',
              message: 'API Key is required',
            },
          ]}
        >
          <Input.Password placeholder="sk-..." />
        </Form.Item>

        <div className="grid grid-cols-2 gap-2">
          <Form.Item label="Timeout (ms)" name="timeout">
            <InputNumber min={1000} step={1000} className="w-full" />
          </Form.Item>
          <Form.Item label="Retries" name="retryCount">
            <InputNumber min={0} max={10} className="w-full" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Form.Item label="Max Tokens" name="maxTokens">
            <InputNumber min={256} step={256} className="w-full" />
          </Form.Item>
          <Form.Item label="Enabled" name="enabled" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
        </div>

        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          loading={submitting}
          onClick={handleSubmit}
          block
        >
          Add Provider
        </Button>
      </Form>
    </Card>
  );
}
