'use client';

import React from 'react';
import { Tag } from 'antd';
import {
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileOutlined,
} from '@ant-design/icons';

interface DocumentIndicatorProps {
  documentInfo: { type: string; name: string } | null;
}

const iconMap: Record<string, React.ReactNode> = {
  word: <FileWordOutlined />,
  excel: <FileExcelOutlined />,
  powerpoint: <FilePptOutlined />,
};

export default function DocumentIndicator({ documentInfo }: DocumentIndicatorProps) {
  const icon = documentInfo ? (iconMap[documentInfo.type] || <FileOutlined />) : <FileOutlined />;
  const name = documentInfo?.name || 'No document';

  return (
    <div className="flex items-center justify-between gap-2 rounded-[18px] bg-white/70 px-3 py-2 shadow-sm ring-1 ring-black/5">
      <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
        <span className="text-sm text-sky-500">{icon}</span>
        <span className="truncate font-medium text-slate-700">{name}</span>
      </div>
      <Tag className="!m-0 capitalize" color="blue">
        {documentInfo?.type || 'offline'}
      </Tag>
    </div>
  );
}
