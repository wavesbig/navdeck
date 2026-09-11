import { AppShell } from '@astryxdesign/core/AppShell';
import { FloatingLogo } from '@/components/layout/FloatingLogo';
import { FloatingToolbar } from '@/components/layout/FloatingToolbar';
import { SettingsHomeLink } from '@/components/settings/SettingsHomeLink';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { SettingsSideNav } from '@/components/settings/SettingsSideNav';
import { getBrandConfig } from '@/lib/brand';
import { getUserPreference } from '@/lib/preferences';
import type { NetworkMode } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 设置面板布局
 *
 * - 共用 FloatingLogo + FloatingToolbar（与主页一致）
 * - 导航使用 AppShell sideNav：桌面端常驻侧栏；
 *   内容列宽与滚动由 SettingsLayout 的 Layout 承担。
 * - 大屏与首页一致：整体限制最大宽度并居中（1360px），
 *   悬浮 Logo/工具栏随框架定位（withinFrame）。
 */
export default async function SettingsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [networkMode, brand, cardSimpleMode] = await Promise.all([
    getUserPreference<NetworkMode>('networkMode', 'auto'),
    getBrandConfig(),
    getUserPreference<boolean>('cardSimpleMode', false),
  ]);

  /**
   * AppShell 断点固定为 none，移动端由 SideNav 的 max-md:hidden 控制，
   * 避免 matchMedia hydration 前后首屏布局变化。
   */
  return (
    <div className="relative mx-auto h-dvh w-full max-w-[1360px]">
      <AppShell
        contentPadding={4}
        height="fill"
        sideNav={<SettingsSideNav />}
        mobileNav={{ breakpoint: 'none', hasToggle: false }}
      >
        <FloatingLogo brand={brand} withinFrame />
        {/* Logo 与标题都隐藏时，品牌入口会一起消失；这里补一个同位置的回首页图标 */}
        {!brand.showLogo && !brand.showTitle && (
          <SettingsHomeLink withinFrame />
        )}
        <FloatingToolbar
          networkMode={networkMode}
          cardSimpleMode={cardSimpleMode}
          withinFrame
        />
        <SettingsLayout>{children}</SettingsLayout>
      </AppShell>
    </div>
  );
}
