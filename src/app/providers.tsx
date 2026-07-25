'use client';

import Link from 'next/link';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { SessionProvider } from 'next-auth/react';
import {useTheme} from '@/hooks/useTheme';

export function Providers({ children }: { children: React.ReactNode }) {
  // useTheme 从 localStorage 读取初始值（lazy initializer），并监听跨组件切换事件
  // Astryx Theme 组件接受 mode='system' 会自动跟随 OS
  const {mode} = useTheme();

  return (
    <Theme theme={neutralTheme} mode={mode}>
      <LinkProvider component={Link}>
        <SessionProvider>{children}</SessionProvider>
      </LinkProvider>
    </Theme>
  );
}
