'use client';

import React from 'react';
import { Collapse, Switch, Tag } from 'antd';
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
    <div>
      <Collapse
        size="middle"
        bordered={false}
        className="rounded-[20px] bg-white/80 shadow-sm ring-1 ring-black/5"
        items={[
          {
            key: 'instructions',
            label: (
              <div className="flex items-center justify-between gap-2 pr-2">
                <span className="text-xs font-medium text-slate-700">
                  Prompt instructions
                </span>
                <Tag color="purple" className="!m-0">
                  {activeIds.length}/{instructions.length} active
                </Tag>
              </div>
            ),
            children: (
              <div className="flex flex-col gap-2">
                {instructions.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-700" title={inst.title}>
                        {inst.title}
                      </div>
                      <div className="truncate text-xs text-slate-400">
                        scope: {inst.scope}{inst.scopeValue ? ` · ${inst.scopeValue}` : ''}
                      </div>
                    </div>
                    <Switch size="small" checked={activeIds.includes(inst.id)} onChange={() => onToggle(inst.id)} />
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
