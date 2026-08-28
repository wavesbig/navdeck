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
 * - 导航使用 AppShell sideNav：桌面端常驻侧栏，
 *   移动端自动转为抽屉并由内部汉堡入口唤起
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
    <AppShell
      contentPadding={4}
      height="fill"
      sideNav={<SettingsSideNav />}
      mobileNav={{ breakpoint: 'md', hasToggle: false }}
    >
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
