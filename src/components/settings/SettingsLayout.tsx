'use client';

import { usePathname } from 'next/navigation';
import { SettingsMobileNavPicker } from '@/components/settings/SettingsSideNav';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

/**
 * 设置面板布局（Client Component）
 *
 * 桌面端导航由 AppShell 的 SideNav 承载；
 * 这里负责移动端分区入口和内容线宽。
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  // 素材库是媒体网格/表格，比常规设置表单需要更宽的内容线
  // 重置 Section 继承到的容器 padding，避免卡片向外逃逸后被滚动容器裁掉圆角。
  const containerPaddingReset =
    '[--container-padding-block-end:0px] [--container-padding-block-start:0px] [--container-padding-inline-end:0px] [--container-padding-inline-start:0px]';
  const contentClassName = pathname.startsWith('/settings/assets')
    ? `mx-auto w-full max-w-[960px] ${containerPaddingReset}`
    : `mx-auto w-full max-w-[720px] ${containerPaddingReset}`;

  return (
    <div className={contentClassName}>
      <SettingsMobileNavPicker />
      {children}
    </div>
  );
}
