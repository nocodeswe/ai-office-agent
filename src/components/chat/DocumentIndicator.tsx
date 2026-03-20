'use client';

import React from 'react';
import { Tag, Button, Dropdown } from 'antd';
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
  const icon = documentInfo ? iconMap[documentInfo.type] || <FileOutlined /> : <FileOutlined />;

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomLeft"
      dropdownRender={() => (
        <div className="w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Document
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl text-blue-500">{icon}</span>
            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {documentInfo?.name || 'No Office document'}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {documentInfo
              ? 'Attached to current chat context.'
              : 'Open from Word, Excel, or PowerPoint to attach context.'}
          </div>
          <div className="mt-3">
            <Tag color={documentInfo ? 'blue' : 'default'} className="capitalize !m-0">
              {documentInfo?.type || 'offline'}
            </Tag>
          </div>
        </div>
      )}
    >
      <Button 
        type="text" 
        size="small" 
        icon={icon}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400"
      >
        <span className="truncate max-w-[120px]">
          {documentInfo?.name || 'No Document'}
        </span>
      </Button>
    </Dropdown>
  );
}
