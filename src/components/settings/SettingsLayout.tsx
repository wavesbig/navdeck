'use client';

import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { usePathname } from 'next/navigation';
import { SettingsMobileNavPicker } from '@/components/settings/SettingsSideNav';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

/**
 * 设置内容列（Client Component）
 *
 * 用 Layout contentWidth 收口内容线宽：常规分区 720，
 * 素材库是媒体网格/表格放宽到 960。滚动交给 LayoutContent，
 * 顶部留白避开固定悬浮的 Logo 与工具栏。
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const isAssets = pathname.startsWith('/settings/assets');

  return (
    <Layout
      contentWidth={isAssets ? 960 : 720}
      content={
        <LayoutContent
          // 归零容器 padding 变量，避免 Section 内容全出血逃逸出卡片；
          // 移动端补水平边距（md 以上由 contentWidth 自然留白）。
          className="pt-28 pb-6 px-4 md:px-0 [--container-padding-block-end:0px] [--container-padding-block-start:0px] [--container-padding-inline-end:0px] [--container-padding-inline-start:0px]"
        >
          <SettingsMobileNavPicker />
          {children}
        </LayoutContent>
      }
    />
  );
}
