'use client';

import React, { useMemo } from 'react';
import { Segmented, Select, Tag } from 'antd';
import { ControlOutlined, RocketOutlined } from '@ant-design/icons';
import type {
  AutoTuneOverrides,
  ChatMode,
  Model,
  ModelOptimizationGoal,
  ModelTaskIntent,
  Provider,
} from '@/types';
import { getEffectiveModelParameters, getProviderPreset } from '@/lib/model-catalog';

interface ModelSelectorProps {
  models: Model[];
  providers: Provider[];
  selectedModelId: string;
  selectedMode: ChatMode;
  selectedProviderId: string;
  optimizationGoal: ModelOptimizationGoal;
  taskIntent: ModelTaskIntent;
  manualOverrides?: AutoTuneOverrides;
  onModelChange: (modelId: string) => void;
  onModeChange: (mode: ChatMode) => void;
  onProviderChange: (providerId: string) => void;
  onOptimizationGoalChange: (goal: ModelOptimizationGoal) => void;
  onTaskIntentChange: (intent: ModelTaskIntent) => void;
}

export default function ModelSelector({
  models,
  providers,
  selectedModelId,
  selectedMode,
  selectedProviderId,
  optimizationGoal,
  taskIntent,
  manualOverrides,
  onModelChange,
  onModeChange,
  onProviderChange,
  onOptimizationGoalChange,
  onTaskIntentChange,
}: ModelSelectorProps) {
  const enabledProviders = useMemo(
    () => providers.filter((provider) => provider.enabled),
    [providers]
  );

  const selectedProvider = enabledProviders.find(
    (provider) => provider.id === selectedProviderId
  );

  const filteredModels = useMemo(
    () => models.filter((model) => model.providerId === selectedProviderId && model.enabled),
    [models, selectedProviderId]
  );

  const selectedModel = filteredModels.find((model) => model.id === selectedModelId);
  const effectiveParameters =
    selectedProvider && selectedModel
      ? getEffectiveModelParameters(selectedProvider, selectedModel, {
          optimizationGoal,
          taskIntent,
          overrides: manualOverrides,
        })
      : null;
  const providerPreset = selectedProvider ? getProviderPreset(selectedProvider.type) : null;

  return (
    <div className="control-surface">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
          <ControlOutlined className="text-sky-300" />
          Model & agent controls
        </div>
        <Tag color={selectedMode === 'agent' ? 'orange' : 'blue'} className="!m-0">
          {selectedMode === 'agent' ? 'Agent mode' : 'Ask mode'}
        </Tag>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Select
          size="large"
          value={selectedProviderId || undefined}
          onChange={onProviderChange}
          placeholder="Choose provider"
          optionLabelProp="plainLabel"
          options={enabledProviders.map((provider) => ({
            value: provider.id,
            plainLabel: provider.name,
            label: (
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-100">{provider.name}</span>
                <Tag className="!ml-auto !mr-0" color="geekblue">
                  {provider.type}
                </Tag>
              </div>
            ),
          }))}
        />

        <Select
          size="large"
          value={selectedModelId || undefined}
          onChange={onModelChange}
          placeholder={selectedProviderId ? 'Choose a visible model' : 'Select provider first'}
          disabled={!selectedProviderId}
          optionLabelProp="plainLabel"
          options={filteredModels.map((model) => ({
            value: model.id,
            plainLabel: model.name,
            label: (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-100">{model.name}</span>
                  {model.profile ? <Tag className="!m-0">{model.profile}</Tag> : null}
                </div>
                <div className="truncate text-xs text-slate-400">{model.description || model.modelId}</div>
              </div>
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
              label: <span className="text-xs font-medium">Ask · Read and advise</span>,
            },
            {
              value: 'agent',
              label: <span className="text-xs font-medium">Agent · Edit-aware</span>,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Select
            size="middle"
            value={optimizationGoal}
            onChange={(value) => onOptimizationGoalChange(value as ModelOptimizationGoal)}
            options={[
              { value: 'speed', label: 'Auto goal · Speed' },
              { value: 'balanced', label: 'Auto goal · Balance' },
              { value: 'quality', label: 'Auto goal · Quality' },
            ]}
          />

          <Select
            size="middle"
            value={taskIntent}
            onChange={(value) => onTaskIntentChange(value as ModelTaskIntent)}
            options={[
              { value: 'general', label: 'Task · General' },
              { value: 'analysis', label: 'Task · Analysis' },
              { value: 'writing', label: 'Task · Writing' },
              { value: 'coding', label: 'Task · Coding' },
            ]}
          />
        </div>
      </div>

      {selectedModel ? (
        <div className="model-card mt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold text-slate-100">
                  {selectedModel.name}
                </div>
                {selectedModel.profile ? <Tag className="!m-0">{selectedModel.profile}</Tag> : null}
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-400">
                {selectedModel.description}
              </div>
            </div>

            {selectedProvider?.autoParameters ? (
              <Tag color="cyan" className="!m-0">
                Auto parameters
              </Tag>
            ) : null}
          </div>

          <div className="mt-3 inline-chip-row">
            {(selectedModel.capabilities || []).map((capability) => (
              <span key={capability} className="capability-chip">
                {capability}
              </span>
            ))}
          </div>

          {(selectedModel.bestFor || []).length ? (
            <div className="mt-3">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Recommended use cases</div>
              <div className="mt-2 inline-chip-row">
                {(selectedModel.bestFor || []).map((scenario) => (
                  <span key={scenario} className="inline-chip">
                    {scenario}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {(selectedModel.limitations || []).length ? (
            <div className="mt-3">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Limitations</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                {(selectedModel.limitations || []).map((limitation) => (
                  <span
                    key={limitation}
                    className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1"
                  >
                    {limitation}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-3 inline-chip-row">
            {selectedModel.contextWindow ? (
              <span className="inline-chip">Context · {selectedModel.contextWindow}</span>
            ) : null}
            {selectedModel.family ? <span className="inline-chip">Family · {selectedModel.family}</span> : null}
            {providerPreset ? <span className="inline-chip">Provider · {providerPreset.label}</span> : null}
          </div>

          {effectiveParameters ? (
            <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-medium text-slate-100">
                <RocketOutlined className="text-sky-300" />
                Effective parameters
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-slate-400">
                <span>Temperature · {effectiveParameters.temperature}</span>
                <span>Max tokens · {effectiveParameters.maxTokens}</span>
                <span>{effectiveParameters.source === 'auto' ? 'Model-driven' : 'Manual'}</span>
                <span>Goal · {optimizationGoal}</span>
                <span>Task · {taskIntent}</span>
              </div>
              <div className="mt-2 leading-5 text-slate-500">{effectiveParameters.note}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
