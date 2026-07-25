import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {ThemeForm} from '@/components/settings/ThemeForm';
import {getUserPreference} from '@/lib/preferences';
import type {ThemeMode} from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 主题设置页
 */
export default async function ThemeSettingsPage() {
  const theme = await getUserPreference<ThemeMode>('theme', 'system');

  return (
    <VStack gap={4}>
      <Heading level={4}>主题</Heading>
      <Text size="sm" color="secondary">
        选择界面主题模式（系统模式会跟随操作系统的明暗设置）
      </Text>
      <ThemeForm initialMode={theme} />
    </VStack>
  );
}
