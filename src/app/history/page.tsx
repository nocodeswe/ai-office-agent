'use client';

import { useEffect, useState, useCallback } from 'react';
import { Typography, Button, Spin } from 'antd';
import { ArrowLeftOutlined, HistoryOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { ChatSession } from '@/types';
import SessionList from '@/components/history/SessionList';
import SessionDetail from '@/components/history/SessionDetail';

const { Title } = Typography;

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : data.sessions ?? []);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      await fetchSessions();
    } catch {
      // silently handle
    }
  };

  if (selectedSessionId) {
    return (
      <div className="task-pane app-shell">
        <SessionDetail
          sessionId={selectedSessionId}
          onBack={() => setSelectedSessionId(null)}
        />
      </div>
    );
  }

  return (
    <div className="task-pane app-shell">
      <div className="px-3 pb-3 pt-3">
        <div className="panel-card flex items-start gap-3 rounded-[24px] px-4 py-4">
          <Button
            type="default"
            shape="circle"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/')}
          />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Workspace
            </div>
            <Title level={4} className="!mb-1 !mt-1">
              History
            </Title>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <HistoryOutlined />
              Review past chats, messages, and change logs.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="soft-card flex h-32 items-center justify-center rounded-[24px] bg-white/70">
            <Spin />
          </div>
        ) : (
          <div className="soft-card overflow-hidden rounded-[24px] bg-white/70">
            <SessionList
              sessions={sessions}
              onSelect={setSelectedSessionId}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </div>
  );
}
