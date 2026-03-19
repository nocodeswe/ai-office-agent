'use client';

import React, { useState, useCallback } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined, LoadingOutlined } from '@ant-design/icons';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function ChatInput({ onSend, disabled, loading }: ChatInputProps) {
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

  return (
    <div className="border-t border-white/60 bg-white/70 px-3 py-3 backdrop-blur">
      <div className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-end gap-2">
          <Input.TextArea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the document, request edits, or generate structured content..."
            autoSize={{ minRows: 1, maxRows: 5 }}
            disabled={disabled || loading}
            style={{ fontSize: 13 }}
            variant="borderless"
            className="flex-1"
          />
          <Button
            type="primary"
            size="middle"
            shape="circle"
            icon={loading ? <LoadingOutlined /> : <SendOutlined />}
            onClick={handleSend}
            disabled={!value.trim() || disabled || loading}
          />
        </div>
        <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>Enter to send, Shift + Enter for a new line</span>
          <span>{loading ? 'Generating…' : 'Ready'}</span>
        </div>
      </div>
    </div>
  );
}
