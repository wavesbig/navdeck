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
import { FONT_SIZE_DEFAULT } from '@/types';

export function Providers({ children }: { children: React.ReactNode }) {
  // useTheme 从 localStorage 读取初始值（lazy initializer），并监听跨组件切换事件
  const { mode, resolved, setMode } = useTheme();
  const { data: prefs } = useSWR(preferencesApi.getKey, preferencesApi.get);

  // 主题以服务端 DB 为权威来源，localStorage 只是 hydration 前的缓存。
  // 两者漂移时（其他浏览器改过 / 上次保存失败）以 DB 为准回写本地，
  // 避免「设置里是跟随系统、实际渲染却是亮色」这类不一致。
  // 只在首次拿到 DB 值时对账一次：持续对账会和用户切换打架
  // （SWR 缓存还是旧值，会把刚切换的主题回滚，表现为「卡住」）。
  const themeReconciled = useRef(false);
  // 故意只依赖 prefs：依赖 mode 会让用户每次切换后重跑 effect，ref 保证只对账一次
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只需在 prefs 首次到达时执行一次
  useEffect(() => {
    if (themeReconciled.current || !prefs?.theme) return;
    themeReconciled.current = true;
    if (prefs.theme !== mode) setMode(prefs.theme);
  }, [prefs?.theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${prefs?.fontSize ?? FONT_SIZE_DEFAULT}%`;
  }, [prefs?.fontSize]);

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
            <ToastViewport>{children}</ToastViewport>
          </SWRConfig>
        </LinkProvider>
      </InternationalizationProvider>
    </Theme>
  );
}
