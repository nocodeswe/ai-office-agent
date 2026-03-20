'use client';

import { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Spin, App, Card } from 'antd';
import { ArrowLeftOutlined, HistoryOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { ChatSession } from '@/types';
import SessionList from '@/components/history/SessionList';
import SessionDetail from '@/components/history/SessionDetail';

const { Title } = Typography;

export default function HistoryPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) {
        throw new Error('Failed to load history');
      }
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : data.sessions ?? []);
    } catch (error: any) {
      message.error(error?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete session');
      }
      await fetchSessions();
    } catch (error: any) {
      message.error(error?.message || 'Failed to delete session');
    }
  };

  if (selectedSessionId) {
    return (
      <div className="task-pane app-shell app-surface">
        <SessionDetail sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />
      </div>
    );
  }

  return (
    <div className="task-pane app-shell app-surface">
      <div className="page-header">
        <div className="flex items-start gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/')} />
          <div>
            <div className="page-header__eyebrow">History</div>
            <Title level={4} className="!mb-1 !mt-1 !text-slate-50">
              Session archive
            </Title>
            <div className="page-header__subtitle flex items-center gap-2">
              <HistoryOutlined />
              Review past chats, decisions, and recorded changes.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="chat-stage items-center justify-center">
            <Spin size="large" />
          </div>
        ) : (
          <Card size="small" className="soft-card">
            <SessionList sessions={sessions} onSelect={setSelectedSessionId} onDelete={handleDelete} />
          </Card>
        )}
      </div>
    </div>
  );
}
