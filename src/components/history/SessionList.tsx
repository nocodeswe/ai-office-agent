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
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  if (sorted.length === 0) {
    return <Empty description="No sessions yet" className="mt-12" />;
  }

  return (
    <List
      size="small"
      dataSource={sorted}
      renderItem={(session) => (
        <List.Item
          className="!px-3 !py-2 cursor-pointer hover:bg-gray-50 transition-colors"
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
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <Text strong ellipsis className="!text-sm">
              {session.title || 'Untitled'}
            </Text>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                {docIcon[session.documentType]}
                <Text ellipsis className="!text-xs !text-gray-500 max-w-[120px]">
                  {session.documentName}
                </Text>
              </span>
              <Tag
                color={session.mode === 'ask' ? 'blue' : 'orange'}
                className="!text-[10px] !leading-none !px-1 !py-0 !m-0"
              >
                {session.mode}
              </Tag>
              <span className="ml-auto whitespace-nowrap">{relativeTime(session.updatedAt)}</span>
            </div>
          </div>
        </List.Item>
      )}
    />
  );
}
