'use client';

import { Heading } from '@astryxdesign/core/Heading';
import { MobileNavToggle } from '@astryxdesign/core/MobileNav';
import { usePathname } from 'next/navigation';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

/**
 * 设置面板布局（Client Component）
 *
 * 常驻导航由 AppShell 的 SideNav/MobileNav 承载；
 * 这里只负责移动端入口、页面标题和内容线宽。
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  // 窄屏下设置壳层无 padding，由内容列补齐水平留白，避免表单顶满视口。
  const contentGutter = 'max-md:px-4';

  // 素材库是媒体网格/表格，比常规设置表单需要更宽的内容线
  const contentClassName = pathname.startsWith('/settings/assets')
    ? `mx-auto w-full max-w-[960px] ${contentGutter}`
    : `mx-auto w-full max-w-[720px] ${contentGutter}`;

  return (
    <div className={contentClassName}>
      {/* 汉堡入口只在 md 以下渲染；桌面端保留常驻 SideNav */}
      <div className="mb-4 flex items-center gap-3 md:hidden">
        <MobileNavToggle label="打开设置导航" />
        <Heading level={1}>设置</Heading>
      </div>
      {children}
    </div>
  );
}
