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
 *   移动端改用内容区里的分区选择按钮和底部弹层
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

  /**
   * AppShell 断点固定为 none，移动端由 SideNav 的 max-md:hidden 控制，
   * 避免 matchMedia hydration 前后首屏布局变化。
   */
  return (
    <AppShell
      contentPadding={4}
      height="fill"
      sideNav={<SettingsSideNav />}
      mobileNav={{ breakpoint: 'none', hasToggle: false }}
    >
      <FloatingLogo brand={brand} />
      {/* Logo 与标题都隐藏时，品牌入口会一起消失；这里补一个同位置的回首页图标 */}
      {!brand.showLogo && !brand.showTitle && <SettingsHomeLink />}
      <FloatingToolbar networkMode={networkMode} />

      <div className="mx-auto w-full max-w-[1024px] pt-20 pb-6 h-[calc(100dvh-5rem)] overflow-y-auto">
        <SettingsLayout>{children}</SettingsLayout>
      </div>
    </AppShell>
  );
}
