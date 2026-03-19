import type { Metadata } from 'next';
import Script from 'next/script';
import AntdProvider from '@/components/layout/AntdProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Office LLM Assistant',
  description: 'AI assistant for Microsoft Office',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
          strategy="beforeInteractive"
        />
        <Script
          id="history-shim"
          strategy="beforeInteractive"
        >
          {`if (!window.history.replaceState) { window.history.replaceState = function(){}; }
if (!window.history.pushState) { window.history.pushState = function(){}; }`}
        </Script>
      </head>
      <body>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
