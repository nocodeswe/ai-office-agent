'use client';

import { useEffect, useState } from 'react';
import { Tabs, Timeline, Tag, Button, Spin, Typography, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ChatSession, ChatMessage, ChangeLogEntry } from '@/types';
import { relativeTime } from '@/lib/utils';

const { Text, Title } = Typography;

interface SessionDetailProps {
  sessionId: string;
  onBack: () => void;
}

export default function SessionDetail({ sessionId, onBack }: SessionDetailProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [changelog, setChangelog] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [sessionRes, changelogRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`),
          fetch(`/api/changelog?sessionId=${sessionId}`),
        ]);
        const sessionData = await sessionRes.json();
        const changelogData = await changelogRes.json();

        setSession(sessionData.session ?? sessionData);
        setMessages(sessionData.messages ?? []);
        setChangelog(Array.isArray(changelogData) ? changelogData : changelogData.entries ?? []);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [sessionId]);

  const toggleExpand = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 shrink-0">
        <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={onBack} />
        <div className="min-w-0 flex-1">
          <Title level={5} ellipsis className="!mb-0 !text-sm">
            {session?.title || 'Untitled'}
          </Title>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            {session && (
              <>
                <Tag
                  color={session.mode === 'ask' ? 'blue' : 'orange'}
                  className="!text-[10px] !leading-none !px-1 !py-0 !m-0"
                >
                  {session.mode}
                </Tag>
                <Text ellipsis className="!text-xs !text-gray-500">
                  {session.documentName}
                </Text>
                <span>· {session.modelId}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="messages"
        size="small"
        className="flex-1 overflow-hidden [&_.ant-tabs-content]:h-full [&_.ant-tabs-tabpane]:h-full"
        items={[
          {
            key: 'messages',
            label: 'Messages',
            children: (
              <div className="overflow-y-auto h-full px-3 py-2 space-y-2">
                {messages.length === 0 ? (
                  <Empty description="No messages" className="mt-8" />
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        <div
                          className={`text-[10px] mt-1 ${
                            msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                          }`}
                        >
                          {relativeTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ),
          },
          {
            key: 'changes',
            label: 'Changes',
            children: (
              <div className="overflow-y-auto h-full px-3 py-2">
                {changelog.length === 0 ? (
                  <Empty description="No changes recorded" className="mt-8" />
                ) : (
                  <Timeline
                    items={changelog.map((entry) => ({
                      children: (
                        <div key={entry.id} className="text-sm">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Tag className="!text-[10px] !px-1 !py-0 !m-0">
                              {entry.operationType}
                            </Tag>
                            <span className="text-[10px] text-gray-400">
                              {relativeTime(entry.createdAt)}
                            </span>
                          </div>
                          <Text className="!text-xs">{entry.description}</Text>
                          {(entry.oldValue || entry.newValue) && (
                            <div className="mt-1">
                              <Button
                                type="link"
                                size="small"
                                className="!p-0 !h-auto !text-[10px]"
                                onClick={() => toggleExpand(entry.id)}
                              >
                                {expandedEntries.has(entry.id) ? 'Hide diff' : 'Show diff'}
                              </Button>
                              {expandedEntries.has(entry.id) && (
                                <div className="mt-1 rounded text-xs font-mono space-y-1">
                                  {entry.oldValue && (
                                    <div
                                      className="px-2 py-1 rounded line-through"
                                      style={{ backgroundColor: '#fff1f0' }}
                                    >
                                      {entry.oldValue}
                                    </div>
                                  )}
                                  {entry.newValue && (
                                    <div
                                      className="px-2 py-1 rounded"
                                      style={{ backgroundColor: '#f6ffed' }}
                                    >
                                      {entry.newValue}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ),
                    }))}
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
