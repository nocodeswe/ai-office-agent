'use client';

import { ConfigProvider, App } from 'antd';
import { theme } from '@/lib/antd-theme';

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
