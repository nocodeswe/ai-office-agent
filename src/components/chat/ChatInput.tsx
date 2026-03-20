'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { Input, Button, Segmented, Popover, Select, Switch, Divider } from 'antd';
import { ArrowUpOutlined, LoadingOutlined, SettingOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { AutoTuneOverrides, ChatMode, Model, ModelOptimizationGoal, ModelTaskIntent, Provider, UserInstruction } from '@/types';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  features: {
    selectedModelId: string;
    selectedMode: ChatMode;
    selectedProviderId: string;
    optimizationGoal: ModelOptimizationGoal;
    taskIntent: ModelTaskIntent;
    manualOverrides: AutoTuneOverrides;
    instructions: UserInstruction[];
    activeInstructionIds: string[];
  };
  handlers: {
    setSelectedModelId: (id: string) => void;
    setSelectedMode: (mode: ChatMode) => void;
    handleProviderChange: (id: string) => void;
    setOptimizationGoal: (goal: ModelOptimizationGoal) => void;
    setTaskIntent: (intent: ModelTaskIntent) => void;
    handleInstructionToggle: (id: string) => void;
  };
  models: Model[];
  providers: Provider[];
}

export default function ChatInput({
  onSend,
  disabled,
  loading,
  placeholder,
  features,
  handlers,
  models,
  providers,
}: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || loading) return;
    onSend(trimmed);
    setValue('');
  }, [value, disabled, loading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const enabledProviders = useMemo(() => providers.filter((p) => p.enabled), [providers]);
  const filteredModels = useMemo(
    () => models.filter((m) => m.providerId === features.selectedProviderId && m.enabled),
    [models, features.selectedProviderId]
  );
  const selectedModel = filteredModels.find((m) => m.id === features.selectedModelId);

  const popoverContent = (
    <div className="w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-4 p-1">
      <div>
         <div className="text-xs font-semibold mb-2 uppercase tracking-wide text-slate-500 dark:text-slate-400">Provider</div>
         <Select
            className="w-full"
            value={features.selectedProviderId || undefined}
            onChange={handlers.handleProviderChange}
            placeholder="Select provider"
            options={enabledProviders.map((provider) => ({
              value: provider.id,
              label: provider.name,
            }))}
         />
      </div>
      <Divider className="!my-0" />
      <div>
         <div className="text-xs font-semibold mb-2 uppercase tracking-wide text-slate-500 dark:text-slate-400">Auto goal</div>
         <Select
            className="w-full"
            value={features.optimizationGoal}
            onChange={handlers.setOptimizationGoal}
            options={[
              { value: 'speed', label: 'Speed' },
              { value: 'balanced', label: 'Balance' },
              { value: 'quality', label: 'Quality' },
            ]}
         />
      </div>
      <div>
         <div className="text-xs font-semibold mb-2 uppercase tracking-wide text-slate-500 dark:text-slate-400">Task</div>
         <Select
            className="w-full"
            value={features.taskIntent}
            onChange={handlers.setTaskIntent}
            options={[
              { value: 'general', label: 'General' },
              { value: 'analysis', label: 'Analysis' },
              { value: 'writing', label: 'Writing' },
              { value: 'coding', label: 'Coding' },
            ]}
         />
      </div>
      <div>
         <div className="text-xs font-semibold mb-2 uppercase tracking-wide text-slate-500 dark:text-slate-400">Layers</div>
         <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2">
            {features.instructions.map((inst) => (
                <div key={inst.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs truncate" title={inst.title}>{inst.title}</span>
                  <Switch 
                     size="small" 
                     checked={features.activeInstructionIds.includes(inst.id)} 
                     onChange={() => handlers.handleInstructionToggle(inst.id)}
                  />
                </div>
            ))}
            {features.instructions.length === 0 && (
                <span className="text-xs text-slate-500">No prompt layers configured.</span>
            )}
         </div>
      </div>
      {selectedModel ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Model info</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{selectedModel.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedModel.description || selectedModel.modelId}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
      <Input.TextArea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Ask anything... (Shift + Enter for new line)'}
        autoSize={{ minRows: 2, maxRows: 8 }}
        disabled={disabled || loading}
        variant="borderless"
        className="w-full p-4 !text-base resize-none"
      />
      
      <div className="flex items-end justify-between gap-2 px-3 pb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          <Popover content={popoverContent} trigger="click" placement="topLeft">
             <Button size="small" type="default" icon={<SettingOutlined />} className="!rounded-lg" />
          </Popover>
          <Popover
            trigger="click"
            placement="topLeft"
            content={
              <div className="max-w-xs text-xs text-slate-600 dark:text-slate-300">
                {selectedModel?.description || 'Select a model to see details.'}
              </div>
            }
          >
            <Button size="small" type="default" icon={<InfoCircleOutlined />} className="!rounded-lg" />
          </Popover>
          <Select
            size="small"
            className="min-w-[160px] flex-1 sm:max-w-[320px]"
            value={features.selectedModelId || undefined}
            onChange={handlers.setSelectedModelId}
            placeholder={features.selectedProviderId ? 'Model' : 'Select provider'}
            disabled={!features.selectedProviderId}
            options={filteredModels.map((model) => ({
              value: model.id,
              label: model.name,
            }))}
          />
          <Segmented
            size="small"
            className="!rounded-lg"
            value={features.selectedMode}
            onChange={(value) => handlers.setSelectedMode(value as ChatMode)}
            options={[
               { value: 'ask', label: 'Ask' },
               { value: 'agent', label: 'Agent' }
            ]}
          />
        </div>

        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={loading ? <LoadingOutlined /> : <ArrowUpOutlined />}
          onClick={handleSend}
          disabled={!value.trim() || disabled || loading}
        />
      </div>
    </div>
  );
}
