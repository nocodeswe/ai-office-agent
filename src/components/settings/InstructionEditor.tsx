'use client';

import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  Popconfirm,
  Empty,
  App,
} from 'antd';
import {
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { UserInstruction, InstructionScope } from '@/types';

const scopeOptions: { label: string; value: InstructionScope }[] = [
  { label: 'All', value: 'all' },
  { label: 'Document', value: 'document' },
  { label: 'Mode', value: 'mode' },
  { label: 'Provider', value: 'provider' },
];

interface InstructionEditorProps {
  instructions: UserInstruction[];
  onRefresh: () => void;
}

// Single instruction card
function InstructionItem({
  instruction,
  onRefresh,
}: {
  instruction: UserInstruction;
  onRefresh: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const scope = Form.useWatch('scope', form) as InstructionScope | undefined;

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        scopeValue: values.scope === 'all' ? null : values.scopeValue,
      };
      const res = await fetch(`/api/instructions/${instruction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      message.success('Instruction saved');
      onRefresh();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/instructions/${instruction.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      message.success('Instruction deleted');
      onRefresh();
    } catch (err: any) {
      message.error(err?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card size="small" className="mb-2">
      <Form
        form={form}
        layout="vertical"
        size="small"
        initialValues={{
          title: instruction.title,
          content: instruction.content,
          enabled: instruction.enabled,
          priority: instruction.priority,
          scope: instruction.scope,
          scopeValue: instruction.scopeValue,
        }}
        className="[&_.ant-form-item]:mb-2"
      >
        <div className="flex items-center gap-2 mb-2">
          <Form.Item name="title" noStyle rules={[{ required: true }]}>
            <Input placeholder="Title" className="flex-1 font-medium" />
          </Form.Item>
          <Form.Item name="enabled" valuePropName="checked" noStyle>
            <Switch size="small" />
          </Form.Item>
        </div>

        <Form.Item name="content" rules={[{ required: true }]}>
          <Input.TextArea
            placeholder="Instruction content..."
            autoSize={{ minRows: 2, maxRows: 6 }}
          />
        </Form.Item>

        <div className="grid grid-cols-3 gap-2">
          <Form.Item label="Priority" name="priority">
            <InputNumber min={0} max={100} className="w-full" />
          </Form.Item>
          <Form.Item label="Scope" name="scope">
            <Select options={scopeOptions} />
          </Form.Item>
          {scope && scope !== 'all' && (
            <Form.Item label="Scope Value" name="scopeValue">
              <Input placeholder="e.g. word" />
            </Form.Item>
          )}
        </div>

        <Space size={6}>
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
            title="Delete this instruction?"
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
      </Form>
    </Card>
  );
}

// Inline add form
function AddInstructionForm({ onRefresh }: { onRefresh: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await fetch('/api/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await res.text());
      message.success('Instruction added');
      form.resetFields();
      setOpen(false);
      onRefresh();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to add instruction');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => setOpen(true)}
        block
        size="small"
      >
        Add Instruction
      </Button>
    );
  }

  return (
    <Card size="small" title="New Instruction">
      <Form
        form={form}
        layout="vertical"
        size="small"
        initialValues={{ scope: 'all' }}
        className="[&_.ant-form-item]:mb-2"
      >
        <Form.Item
          label="Title"
          name="title"
          rules={[{ required: true, message: 'Title is required' }]}
        >
          <Input placeholder="Instruction title" />
        </Form.Item>

        <Form.Item
          label="Content"
          name="content"
          rules={[{ required: true, message: 'Content is required' }]}
        >
          <Input.TextArea
            placeholder="Write your instruction..."
            autoSize={{ minRows: 2, maxRows: 6 }}
          />
        </Form.Item>

        <Form.Item label="Scope" name="scope">
          <Select options={scopeOptions} />
        </Form.Item>

        <Space size={6}>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            loading={submitting}
            onClick={handleSubmit}
          >
            Add
          </Button>
          <Button size="small" onClick={() => { setOpen(false); form.resetFields(); }}>
            Cancel
          </Button>
        </Space>
      </Form>
    </Card>
  );
}

export default function InstructionEditor({
  instructions,
  onRefresh,
}: InstructionEditorProps) {
  if (instructions.length === 0) {
    return (
      <div>
        <Empty
          description="No instructions yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="mb-3"
        />
        <AddInstructionForm onRefresh={onRefresh} />
      </div>
    );
  }

  return (
    <div>
      {instructions.map((inst) => (
        <InstructionItem
          key={inst.id}
          instruction={inst}
          onRefresh={onRefresh}
        />
      ))}
      <AddInstructionForm onRefresh={onRefresh} />
    </div>
  );
}
