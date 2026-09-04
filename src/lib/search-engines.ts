import { prisma } from '@/lib/db';
import type { CustomSearchEngine, SearchEngineConfig } from '@/types';

/**
 * DB 行 → 引擎配置（key 即 DB id）
 *
 * 内置 5 引擎已由迁移落库（20260903094145），与自定义引擎统一管理：
 * 全部可编辑、可删除（服务端保证至少保留 1 个）、可拖拽排序。
 */
export function toEngineConfig(row: CustomSearchEngine): SearchEngineConfig {
  return {
    key: row.id,
    name: row.name,
    urlTemplate: row.urlTemplate,
    logo: row.iconPath,
  };
}

/** 全部引擎列表（按 order 排序） */
export async function listSearchEngines(): Promise<SearchEngineConfig[]> {
  const rows = await prisma.searchEngine.findMany({
    orderBy: { order: 'asc' },
  });
  return rows.map(toEngineConfig);
}
