'use client';

import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import { LinkProvider } from '@astryxdesign/core/Link';
import '@astryxdesign/core/reset.css';
import { ToastViewport } from '@astryxdesign/core/Toast';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import useSWR, { SWRConfig } from 'swr';
import { useTheme } from '@/hooks/useTheme';
import { astryxZh } from '@/lib/astryx-locale-zh';
import { errorMiddleware } from '@/lib/request/middleware';
import { swrFetcher } from '@/lib/request/request';
import { preferencesApi } from '@/services';
import type { FontSizePreference, ThemeMode } from '@/types';

interface ProvidersProps {
  children: React.ReactNode;
  initialFontSize: FontSizePreference;
  initialTheme: ThemeMode;
}

export function Providers({
  children,
  initialFontSize,
  initialTheme,
}: ProvidersProps) {
  // SSR 已读取数据库偏好；hydration 首帧必须保持同一主题，避免二次切换
  const { mode, resolved, setMode } = useTheme(initialTheme);
  const { data: prefs } = useSWR(preferencesApi.getKey, preferencesApi.get);

  // 主题以服务端 DB 为权威来源，localStorage 只是 hydration 前的缓存。
  // 两者漂移时（其他浏览器改过 / 上次保存失败）以 DB 为准回写本地，
  // 避免「设置里是跟随系统、实际渲染却是亮色」这类不一致。
  // 只在首次拿到 DB 值时对账一次：持续对账会和用户切换打架
  // （SWR 缓存还是旧值，会把刚切换的主题回滚，表现为「卡住」）。
  // ref 守卫保证对账只执行一次，后续 mode 变化重跑 effect 时直接跳过。
  const themeReconciled = useRef(false);
  useEffect(() => {
    if (themeReconciled.current || !prefs?.theme) return;
    themeReconciled.current = true;
    if (prefs.theme !== mode) setMode(prefs.theme);
  }, [mode, prefs?.theme, setMode]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${prefs?.fontSize ?? initialFontSize}%`;
  }, [initialFontSize, prefs?.fontSize]);

  // 用解析后的明暗值，避免 Astryx system 模式移除 html[data-theme]
  // 后与项目内依赖 data-theme 的暗色样式产生两种主题混用
  return (
    <Theme theme={neutralTheme} mode={resolved}>
      <InternationalizationProvider locale="zh" messages={{ zh: astryxZh }}>
        <LinkProvider component={Link}>
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
            <ToastViewport position="topEnd">{children}</ToastViewport>
          </SWRConfig>
        </LinkProvider>
      </InternationalizationProvider>
    </Theme>
  );
}
