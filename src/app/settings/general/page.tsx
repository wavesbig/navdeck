import { VStack } from '@astryxdesign/core/VStack';
import { AccountForm } from '@/components/settings/AccountForm';
import { BackupManager } from '@/components/settings/BackupManager';
import { BrandForm } from '@/components/settings/BrandForm';
import { NetworkForm } from '@/components/settings/NetworkForm';
import { PasswordForm } from '@/components/settings/PasswordForm';
import { VersionCheckSetting } from '@/components/settings/VersionCheckSetting';
import { getBrandConfig } from '@/lib/brand';
import { getUserPreference } from '@/lib/preferences';
import type { NetworkMode, VersionUpdateInfo } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 通用设置页（Linear / Vercel 风格）
 *
 * 6 个独立 Card：
 * - 品牌（标题 / Logo）
 * - 账号（用户名）
 * - 安全（密码）
 * - 网络（网络模式）
 * - 备份（导出 / 导入）
 * - 版本更新（自动检测开关 / 手动检查）
 */
export default async function GeneralSettingsPage() {
  const [brand, networkMode, versionCheckEnabled, versionCheckCache] =
    await Promise.all([
      getBrandConfig(),
      getUserPreference<NetworkMode>('networkMode', 'auto'),
      getUserPreference<boolean>('versionCheckEnabled', true),
      getUserPreference<VersionUpdateInfo | null>('versionCheckCache', null),
    ]);

  return (
    <VStack gap={6}>
      <BrandForm initialBrand={brand} />
      <AccountForm />
      <PasswordForm />
      <NetworkForm initialMode={networkMode} />
      <VersionCheckSetting
        initialEnabled={versionCheckEnabled}
        initialUpdate={versionCheckCache}
      />
      <BackupManager />
    </VStack>
  );
}
