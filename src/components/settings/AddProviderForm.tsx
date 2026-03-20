'use client';

import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  App,
  InputNumber,
  Switch,
  Typography,
  Slider,
  Tag,
} from 'antd';
import { PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { ProviderType } from '@/types';
import { PROVIDER_PRESETS, getProviderPreset } from '@/lib/model-catalog';

const { Text } = Typography;

const providerTypes = (Object.keys(PROVIDER_PRESETS) as ProviderType[]).map((type) => ({
  value: type,
  label: PROVIDER_PRESETS[type].label,
}));

interface AddProviderFormProps {
  onAdded: () => void;
}

export default function AddProviderForm({ onAdded }: AddProviderFormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const selectedType = Form.useWatch('type', form) as ProviderType | undefined;
  const selectedTemperature = (Form.useWatch('temperature', form) as number | undefined) ?? 0.3;
  const preset = selectedType ? getProviderPreset(selectedType) : null;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        ...values,
        apiBaseUrl: values.apiBaseUrl || (values.type ? getProviderPreset(values.type).baseUrl : ''),
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
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to add provider');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card size="small" className="soft-card" title="Add provider">
      <div className="provider-preset mb-4">
        <div className="flex items-start gap-2">
          <SafetyCertificateOutlined className="mt-1 text-emerald-400" />
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Quick connection flow</div>
            <Text className="!text-xs !text-slate-600 dark:!text-slate-400">
              Connect a provider, fetch models, pick the ones that should appear in chat, and optionally let the app tune parameters automatically.
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
          autoParameters: true,
          timeout: 30000,
          retryCount: 3,
          maxTokens: 4096,
          temperature: 0.3,
        }}
        className="[&_.ant-form-item]:mb-3"
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input placeholder="Team workspace / Personal OpenAI" />
        </Form.Item>

        <Form.Item
          label="Provider type"
          name="type"
          rules={[{ required: true, message: 'Type is required' }]}
        >
          <Select placeholder="Select provider" options={providerTypes} />
        </Form.Item>

        {preset ? (
          <div className="provider-preset mb-4">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{preset.label}</div>
            <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{preset.description}</div>
            <div className="mt-3 inline-chip-row">
              {preset.strengths.map((strength) => (
                <Tag key={strength} className="!m-0" color="blue">
                  {strength}
                </Tag>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">{preset.setupHint}</div>
          </div>
        ) : null}

        <Form.Item label="API Base URL" name="apiBaseUrl">
          <Input placeholder={preset?.baseUrl || 'https://...'} />
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
          <Input.Password placeholder={selectedType === 'ollama' ? 'Optional token' : 'sk-...'} />
        </Form.Item>

        <div className="grid grid-cols-2 gap-2">
          <Form.Item label="Timeout (ms)" name="timeout">
            <InputNumber min={1000} step={1000} className="w-full" />
          </Form.Item>
          <Form.Item label="Retries" name="retryCount">
            <InputNumber min={0} max={10} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item label="Max tokens fallback" name="maxTokens">
          <InputNumber min={256} step={256} className="w-full" />
        </Form.Item>

        <Form.Item label={`Temperature fallback · ${selectedTemperature.toFixed(1)}`} name="temperature">
          <Slider min={0} max={2} step={0.1} />
        </Form.Item>

        <div className="grid grid-cols-2 gap-2">
          <div className="setting-item">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Enable now</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Make this provider available in chat immediately.</div>
              </div>
              <Form.Item name="enabled" valuePropName="checked" className="!mb-0">
                <Switch size="small" />
              </Form.Item>
            </div>
          </div>

          <div className="setting-item">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Auto parameters</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Use model-aware recommendations when available.</div>
              </div>
              <Form.Item name="autoParameters" valuePropName="checked" className="!mb-0">
                <Switch size="small" />
              </Form.Item>
            </div>
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          loading={submitting}
          onClick={handleSubmit}
          block
        >
          Add provider
        </Button>
      </Form>
    </Card>
  );
}
