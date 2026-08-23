import { VStack } from '@astryxdesign/core/VStack';
import { LuckyConfigForm } from '@/components/settings/LuckyConfigForm';
import { prisma } from '@/lib/db';
import { getUserPreference } from '@/lib/preferences';
import { DEFAULT_LUCKY_CONFIG, getMissingLuckyCards } from '@/services/lucky';
import type { Category, LuckyConfig } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 集成设置页
 *
 * 目前只有 Lucky 同步一个集成：
 * - 配置 Lucky 后台地址 + OpenToken
 * - 手动触发同步拉取反代规则
 */
export default async function IntegrationsSettingsPage() {
  const [config, categories, missingCards] = await Promise.all([
    getUserPreference<LuckyConfig>('lucky', DEFAULT_LUCKY_CONFIG),
    prisma.category.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, icon: true, color: true, order: true },
    }),
    getMissingLuckyCards(),
  ]);

  const initialCategories: Category[] = categories.map((c) => ({
    ...c,
    icon: c.icon ?? null,
    color: c.color ?? null,
  }));

  return (
    <VStack gap={6} maxWidth={640}>
      <LuckyConfigForm
        initialConfig={config}
        categories={initialCategories}
        initialMissingCards={missingCards}
      />
    </VStack>
  );
}
