'use client';

import { List, Tag, Button, Popconfirm, Empty, Typography } from 'antd';
import {
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ChatSession, DocumentType } from '@/types';
import { relativeTime } from '@/lib/utils';

const { Text } = Typography;

interface SessionListProps {
  sessions: ChatSession[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const docIcon: Record<DocumentType, React.ReactNode> = {
  word: <FileWordOutlined />,
  excel: <FileExcelOutlined />,
  powerpoint: <FilePptOutlined />,
};

export default function SessionList({ sessions, onSelect, onDelete }: SessionListProps) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  if (sorted.length === 0) {
    return <Empty description="No sessions yet" className="py-10" />;
  }

  return (
    <List
      size="small"
      dataSource={sorted}
      renderItem={(session) => (
        <List.Item
          className="!cursor-pointer !rounded-2xl !border !border-white/5 !px-4 !py-3 transition-colors hover:!border-sky-500/30 hover:!bg-white/[0.04]"
          onClick={() => onSelect(session.id)}
          actions={[
            <Popconfirm
              key="del"
              title="Delete this session?"
              onConfirm={(e) => {
                e?.stopPropagation();
                onDelete(session.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>,
          ]}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Text strong ellipsis className="!text-sm !text-slate-100">
              {session.title || 'Untitled'}
            </Text>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="flex min-w-0 items-center gap-1">
                {docIcon[session.documentType]}
                <Text ellipsis className="!max-w-[180px] !text-xs !text-slate-400">
                  {session.documentName}
                </Text>
              </span>
              <Tag
                color={session.mode === 'ask' ? 'blue' : 'orange'}
                className="!m-0 !text-[10px]"
              >
                {session.mode}
              </Tag>
              <span className="inline-chip">{session.modelId}</span>
              <span className="ml-auto whitespace-nowrap">{relativeTime(session.updatedAt)}</span>
            </div>
          </div>
        </List.Item>
      )}
    />
  );
}
