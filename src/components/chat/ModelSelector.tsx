'use client';

import React from 'react';
import { Segmented, Select, Tag, Tooltip } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import type { Model, Provider, ChatMode } from '@/types';

interface ModelSelectorProps {
  models: Model[];
  providers: Provider[];
  selectedModelId: string;
  selectedMode: ChatMode;
  selectedProviderId: string;
  onModelChange: (modelId: string) => void;
  onModeChange: (mode: ChatMode) => void;
  onProviderChange: (providerId: string) => void;
}

export default function ModelSelector({
  models,
  providers,
  selectedModelId,
  selectedMode,
  selectedProviderId,
  onModelChange,
  onModeChange,
  onProviderChange,
}: ModelSelectorProps) {
  const enabledProviders = providers.filter((p) => p.enabled);
  const filteredModels = models.filter(
    (m) => m.providerId === selectedProviderId && m.enabled
  );

  return (
    <div className="rounded-[20px] bg-white/80 px-3 py-3 shadow-sm ring-1 ring-black/5">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        <RobotOutlined />
        Assistant controls
      </div>
      <div className="grid grid-cols-1 gap-2">
        <Select
          size="middle"
          value={selectedProviderId || undefined}
          onChange={onProviderChange}
          placeholder="Choose provider"
          optionLabelProp="plainLabel"
          options={enabledProviders.map((p) => ({
            value: p.id,
            plainLabel: p.name,
            label: (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.enabled ? '#52c41a' : '#d9d9d9' }}
                />
                <span>{p.name}</span>
                <Tag className="!ml-auto !mr-0" color="geekblue">
                  {p.type}
                </Tag>
              </span>
            ),
          }))}
        />
        <Select
          size="middle"
          value={selectedModelId || undefined}
          onChange={onModelChange}
          placeholder={
            selectedProviderId ? 'Choose a visible model' : 'Select provider first'
          }
          disabled={!selectedProviderId}
          options={filteredModels.map((m) => ({
            value: m.id,
            label: (
              <Tooltip title={m.modelId}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{m.name}</span>
                  <span className="truncate text-[11px] text-slate-400">{m.modelId}</span>
                </div>
              </Tooltip>
            ),
          }))}
        />
        <Segmented
          block
          value={selectedMode}
          onChange={(value) => onModeChange(value as ChatMode)}
          options={[
            {
              value: 'ask',
              label: <Tag color="blue" style={{ margin: 0 }}>Ask · Read only</Tag>,
            },
            {
              value: 'agent',
              label: <Tag color="orange" style={{ margin: 0 }}>Agent · Can edit</Tag>,
            },
          ]}
        />
      </div>
    </div>
  );
}
