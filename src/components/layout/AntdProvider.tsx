'use client';

import { ConfigProvider, App } from 'antd';
import { getThemeConfig } from '@/lib/antd-theme';
import { useEffect, useState } from 'react';

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const storedTheme = window.localStorage.getItem('workspace-theme');
    if (storedTheme) {
      return storedTheme === 'dark';
    }

    return document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const syncTheme = () => {
      const storedTheme = window.localStorage.getItem('workspace-theme');
      const nextIsDark = storedTheme
        ? storedTheme === 'dark'
        : document.documentElement.classList.contains('dark') ||
          window.matchMedia('(prefers-color-scheme: dark)').matches;

      setIsDark(nextIsDark);
    };

    syncTheme();

    const observer = new MutationObserver(() => {
      syncTheme();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return (
    <ConfigProvider theme={getThemeConfig(isDark)}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
