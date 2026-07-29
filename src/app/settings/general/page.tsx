import { VStack } from '@astryxdesign/core/VStack';
import { AccountForm } from '@/components/settings/AccountForm';
import { NetworkForm } from '@/components/settings/NetworkForm';
import { PasswordForm } from '@/components/settings/PasswordForm';
import { getUserPreference } from '@/lib/preferences';
import type { NetworkMode } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 通用设置页（Linear / Vercel 风格）
 *
 * 3 个独立 Card：
 * - 账号（用户名）
 * - 安全（密码）
 * - 网络（网络模式）
 */
export default async function GeneralSettingsPage() {
  const networkMode = await getUserPreference<NetworkMode>(
    'networkMode',
    'auto',
  );

  return (
    <VStack gap={6} className="max-w-[640px]">
      <AccountForm />
      <PasswordForm />
      <NetworkForm initialMode={networkMode} />
    </VStack>
  );
}
