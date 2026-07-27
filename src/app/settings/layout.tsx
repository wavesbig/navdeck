import { AppShell } from '@astryxdesign/core/AppShell';
import { FloatingLogo } from '@/components/layout/FloatingLogo';
import { FloatingToolbar } from '@/components/layout/FloatingToolbar';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { getUserPreference } from '@/lib/preferences';
import type { NetworkMode } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 设置面板布局
 *
 * - 共用 FloatingLogo + FloatingToolbar（与主页一致）
 * - 内部 SettingsLayout 提供左侧 tab 导航
 */
export default async function SettingsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const networkMode = await getUserPreference<NetworkMode>(
    'networkMode',
    'auto',
  );

  return (
    <AppShell contentPadding={4} height="fill">
      <FloatingLogo />
      <FloatingToolbar networkMode={networkMode} />

      <div className="mx-auto w-full max-w-[1024px] pt-20">
        <SettingsLayout>{children}</SettingsLayout>
      </div>
    </AppShell>
  );
}
