import { AppShell } from '@astryxdesign/core/AppShell';
import { FloatingLogo } from '@/components/layout/FloatingLogo';
import { FloatingToolbar } from '@/components/layout/FloatingToolbar';
import { SettingsHomeLink } from '@/components/settings/SettingsHomeLink';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { getBrandConfig } from '@/lib/brand';
import { getUserPreference } from '@/lib/preferences';
import type { NetworkMode } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 设置面板布局
 *
 * - 共用 FloatingLogo + FloatingToolbar（与主页一致）
 * - 内部 SettingsLayout 基于 Astryx Layout 组件系统：
 *   桌面端左侧 sidebar + 右侧内容；移动端顶部 TabList + 下方内容
 */
export default async function SettingsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [networkMode, brand] = await Promise.all([
    getUserPreference<NetworkMode>('networkMode', 'auto'),
    getBrandConfig(),
  ]);

  return (
    <AppShell contentPadding={4} height="fill">
      <FloatingLogo brand={brand} />
      {/* Logo 与标题都隐藏时，品牌入口会一起消失；这里补一个同位置的回首页图标 */}
      {!brand.showLogo && !brand.showTitle && <SettingsHomeLink />}
      <FloatingToolbar networkMode={networkMode} />

      <div className="mx-auto w-full max-w-[1024px] pt-20 h-[calc(100dvh-5rem)]">
        <SettingsLayout>{children}</SettingsLayout>
      </div>
    </AppShell>
  );
}
