'use client';

import React from 'react';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: string;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { role, content, createdAt } = message;

  if (role === 'system') {
    return (
      <div className="flex justify-center my-1 px-2">
        <div className="text-xs text-gray-400 italic text-center max-w-[90%]">
          {content}
          {createdAt && (
            <span className="block text-[10px] mt-0.5">
              {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    );
  }

  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 px-1`}>
      <div
        className={`max-w-[88%] rounded-[22px] border px-3 py-2.5 shadow-sm ${
          isUser
            ? 'border-sky-200 bg-gradient-to-br from-sky-50 to-blue-100'
            : 'border-white/80 bg-white/95'
        }`}
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {isUser ? 'You' : 'Assistant'}
        </div>
        <div className="message-content">{content}</div>
        {createdAt && (
          <div
            className="text-right mt-1"
            style={{ fontSize: 10, color: '#94a3b8' }}
          >
            {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}
