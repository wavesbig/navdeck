'use client';

import Link from 'next/link';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  // M1 阶段强制亮色（白色为设计基准），M1.5 设置面板加切换器后改为 system
  return (
    <Theme theme={neutralTheme} mode="light">
      <LinkProvider component={Link}>
        <SessionProvider>{children}</SessionProvider>
      </LinkProvider>
    </Theme>
  );
}
