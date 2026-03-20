'use client';

import React from 'react';
import { RobotOutlined, UserOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: string;
  };
}

const { Text } = Typography;

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-lg font-semibold mt-1 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mt-1 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-1 mb-1.5">{children}</h3>,
  p: ({ children }) => <p className="leading-6 mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-4 border-slate-300 dark:border-slate-600 pl-3 italic text-slate-700 dark:text-slate-300">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top">{children}</td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
    >
      {children}
    </a>
  ),
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const { role, content, createdAt } = message;
  const normalizedContent = content.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n');

  if (role === 'system') {
    return (
      <div className="flex justify-center px-2">
        <div className="inline-flex max-w-[90%] items-center gap-2 rounded-full border border-white/10 dark:bg-white/[0.04] bg-black/5 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
          <InfoCircleOutlined />
          <span>{content}</span>
        </div>
      </div>
    );
  }

  const isUser = role === 'user';
  const timeLabel = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`message-row ${isUser ? 'message-row--user' : ''}`}>
      {!isUser ? (
        <div className="message-avatar bg-slate-100/50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <RobotOutlined />
        </div>
      ) : null}

      <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--assistant'}`}>
        <div className="message-label text-slate-500 dark:text-slate-400">
          <Text className="!text-inherit !text-[11px] !font-semibold !uppercase !tracking-[0.14em]">
            {isUser ? 'You' : 'Assistant'}
          </Text>
          {timeLabel ? (
            <Text className="!text-inherit !text-[11px] !font-semibold !uppercase !tracking-[0.14em]">
              {timeLabel}
            </Text>
          ) : null}
        </div>
        <div className="message-content prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {normalizedContent}
          </ReactMarkdown>
        </div>
      </div>

      {isUser ? (
        <div className="message-avatar bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          <UserOutlined />
        </div>
      ) : null}
    </div>
  );
}
