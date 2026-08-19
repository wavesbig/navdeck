'use client';

import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import { LinkProvider } from '@astryxdesign/core/Link';
import '@astryxdesign/core/reset.css';
import { ToastViewport } from '@astryxdesign/core/Toast';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import Link from 'next/link';
import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { useTheme } from '@/hooks/useTheme';
import { astryxZh } from '@/lib/astryx-locale-zh';
import { errorMiddleware } from '@/lib/request/middleware';
import { swrFetcher } from '@/lib/request/request';

export function Providers({ children }: { children: React.ReactNode }) {
  // useTheme 从 localStorage 读取初始值（lazy initializer），并监听跨组件切换事件
  // Astryx Theme 组件接受 mode='system' 会自动跟随 OS
  const { mode } = useTheme();

  return (
    <Theme theme={neutralTheme} mode={mode}>
      <InternationalizationProvider locale="zh" messages={{ zh: astryxZh }}>
        <LinkProvider component={Link}>
          <SessionProvider>
            <SWRConfig
              value={{
                fetcher: swrFetcher,
                revalidateOnFocus: true,
                revalidateOnReconnect: true,
                revalidateIfStale: true,
                errorRetryCount: 0,
                use: [errorMiddleware],
              }}
            >
              <ToastViewport>{children}</ToastViewport>
            </SWRConfig>
          </SessionProvider>
        </LinkProvider>
      </InternationalizationProvider>
    </Theme>
  );
}
