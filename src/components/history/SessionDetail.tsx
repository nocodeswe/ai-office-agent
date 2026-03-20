'use client';

import { useEffect, useState } from 'react';
import { App, Tabs, Button, Spin, Typography, Empty, Timeline, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ChatSession, ChatMessage, ChangeLogEntry } from '@/types';
import { relativeTime } from '@/lib/utils';
import ChatMessageView from '@/components/chat/ChatMessage';

const { Text, Title } = Typography;

interface SessionDetailProps {
  sessionId: string;
  onBack: () => void;
}

export default function SessionDetail({ sessionId, onBack }: SessionDetailProps) {
  const { message } = App.useApp();
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

        if (!sessionRes.ok || !changelogRes.ok) {
          throw new Error('Failed to load session details');
        }

        const sessionData = await sessionRes.json();
        const changelogData = await changelogRes.json();

        setSession(sessionData.session ?? sessionData);
        setMessages(sessionData.messages ?? []);
        setChangelog(Array.isArray(changelogData) ? changelogData : changelogData.entries ?? []);
      } catch (error: any) {
        message.error(error?.message || 'Failed to load session details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [message, sessionId]);

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
      <div className="flex min-h-full items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-4 pb-4">
      <div className="page-header !px-0">
        <div className="flex min-w-0 items-start gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={onBack} />
          <div className="min-w-0">
            <div className="page-header__eyebrow">Session detail</div>
            <Title level={4} className="!mb-1 !mt-1 !text-slate-50" ellipsis>
              {session?.title || 'Untitled'}
            </Title>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {session ? (
                <>
                  <Tag color={session.mode === 'ask' ? 'blue' : 'orange'} className="!m-0">
                    {session.mode}
                  </Tag>
                  <span className="inline-chip">{session.documentName}</span>
                  <span className="inline-chip">{session.modelId}</span>
                  <span>{relativeTime(session.updatedAt)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="chat-stage min-h-0 flex-1">
        <Tabs
          defaultActiveKey="messages"
          className="h-full px-4 pt-2 [&_.ant-tabs-content]:h-[calc(100%-16px)] [&_.ant-tabs-tabpane]:h-full"
          items={[
            {
              key: 'messages',
              label: 'Messages',
              children: (
                <div className="chat-scroll h-full overflow-y-auto pb-4">
                  {messages.length === 0 ? (
                    <Empty description="No messages" className="mt-12" />
                  ) : (
                    <div className="message-thread pr-1">
                      {messages.map((msg) => (
                        <ChatMessageView key={msg.id} message={msg} />
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'changes',
              label: 'Changes',
              children: (
                <div className="chat-scroll h-full overflow-y-auto pb-4 pr-1">
                  {changelog.length === 0 ? (
                    <Empty description="No changes recorded" className="mt-12" />
                  ) : (
                    <Timeline
                      items={changelog.map((entry) => ({
                        children: (
                          <div key={entry.id} className="model-card">
                            <div className="flex flex-wrap items-center gap-2">
                              <Tag className="!m-0">{entry.operationType}</Tag>
                              <Text className="!text-xs !text-slate-500">
                                {relativeTime(entry.createdAt)}
                              </Text>
                            </div>
                            <Text className="!mt-2 !block !text-sm !text-slate-200">
                              {entry.description}
                            </Text>
                            {(entry.oldValue || entry.newValue) ? (
                              <div className="mt-3">
                                <Button
                                  type="link"
                                  size="small"
                                  className="!p-0"
                                  onClick={() => toggleExpand(entry.id)}
                                >
                                  {expandedEntries.has(entry.id) ? 'Hide diff' : 'Show diff'}
                                </Button>
                                {expandedEntries.has(entry.id) ? (
                                  <div className="mt-3 space-y-2 font-mono text-xs">
                                    {entry.oldValue ? (
                                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-100">
                                        {entry.oldValue}
                                      </div>
                                    ) : null}
                                    {entry.newValue ? (
                                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                                        {entry.newValue}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
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
    </div>
  );
}
