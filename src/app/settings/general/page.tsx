import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { prisma } from '@/lib/db';
import { getUserPreference } from '@/lib/preferences';
import type { NetworkMode, SearchEngine, ThemeMode } from '@/types';
import { SEARCH_ENGINES } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 基础设置页
 *
 * 展示当前账号 + 网络模式 + 主题 + 搜索引擎的概览（只读）
 * 详细配置请进入对应子页面
 */
export default async function GeneralSettingsPage() {
  const [networkMode, theme, searchEngine] = await Promise.all([
    getUserPreference<NetworkMode>('networkMode', 'auto'),
    getUserPreference<ThemeMode>('theme', 'system'),
    getUserPreference<SearchEngine>('searchEngine', 'google'),
  ]);

  const user = await prisma.user.findFirst();

  const searchEngineName =
    SEARCH_ENGINES.find((e) => e.key === searchEngine)?.name ?? 'Google';

  const networkModeLabel: Record<NetworkMode, string> = {
    auto: '自动',
    internal: '内网',
    external: '外网',
  };

  const themeLabel: Record<ThemeMode, string> = {
    light: '明亮',
    dark: '暗黑',
    system: '跟随系统',
  };

  return (
    <VStack gap={4}>
      <Heading level={4}>基础设置</Heading>
      <Text size="sm" color="secondary">
        当前应用的配置概览，详细修改请进入对应子页面
      </Text>

      <Card padding={4}>
        <VStack gap={3}>
          <InfoRow label="当前账号" value={user?.username ?? '—'} />
          <Divider />
          <InfoRow label="网络模式" value={networkModeLabel[networkMode]} />
          <Divider />
          <InfoRow label="主题模式" value={themeLabel[theme]} />
          <Divider />
          <InfoRow label="默认搜索引擎" value={searchEngineName} />
        </VStack>
      </Card>

      <Text size="sm" color="secondary">
        提示：使用右上角 Cmd+K 快捷键可以快速打开搜索框
      </Text>
    </VStack>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="between" align="center">
      <Text size="sm" color="secondary">
        {label}
      </Text>
      <Text size="sm" weight="medium">
        {value}
      </Text>
    </HStack>
  );
}
