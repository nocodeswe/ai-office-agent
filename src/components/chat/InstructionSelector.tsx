'use client';

import React from 'react';
import { Tag } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import type { UserInstruction } from '@/types';

interface InstructionSelectorProps {
  instructions: UserInstruction[];
  activeIds: string[];
  onToggle: (id: string) => void;
}

export default function InstructionSelector({
  instructions,
  activeIds,
  onToggle,
}: InstructionSelectorProps) {
  if (!instructions.length) return null;

  return (
    <div className="control-surface py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
          <BulbOutlined className="text-amber-300" />
          Prompt layers
        </div>
        <Tag color="purple" className="!m-0">
          {activeIds.length}/{instructions.length} active
        </Tag>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {instructions.map((instruction) => {
          const active = activeIds.includes(instruction.id);

          return (
            <button
              key={instruction.id}
              type="button"
              onClick={() => onToggle(instruction.id)}
              className={`model-card model-card--interactive min-w-0 flex-1 text-left ${
                active ? 'model-card--active' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-100">
                    {instruction.title}
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-400">
                    Scope: {instruction.scope}
                    {instruction.scopeValue ? ` · ${instruction.scopeValue}` : ''}
                  </div>
                </div>
                <Tag color={active ? 'blue' : 'default'} className="!m-0">
                  {active ? 'On' : 'Off'}
                </Tag>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
