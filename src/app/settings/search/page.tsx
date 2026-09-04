import { VStack } from '@astryxdesign/core/VStack';
import { SearchEngineManager } from '@/components/settings/SearchEngineManager';
import { listSearchEngines } from '@/lib/search-engines';

export const dynamic = 'force-dynamic';

/**
 * 搜索设置页
 *
 * - 内置 5 引擎只读展示
 * - 自定义引擎增删改 + 排序
 */
export default async function SearchSettingsPage() {
  const engines = await listSearchEngines();

  return (
    <VStack gap={6}>
      <SearchEngineManager initialEngines={engines} />
    </VStack>
  );
}
