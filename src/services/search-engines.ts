import { request } from '@/lib/request/request';
import type { SearchEngineConfig } from '@/types';

/** 自定义搜索引擎表单载荷 */
export interface SearchEngineFormPayload {
  name: string;
  urlTemplate: string;
  iconPath?: string | null;
}

/**
 * 搜索引擎 API service
 *
 * 列表 = 内置 + 自定义合并（内置在前）；SWR key 供变更后重新验证
 */
export const searchEnginesApi = {
  /** SWR key：合并引擎列表 */
  getKey: '/api/search-engines' as const,

  list: (_key?: string, opts: { signal?: AbortSignal } = {}) =>
    request<{ items: SearchEngineConfig[] }>('/api/search-engines', {
      signal: opts?.signal,
    }),

  create: (payload: SearchEngineFormPayload) =>
    request<SearchEngineConfig>('/api/search-engines', {
      method: 'POST',
      body: payload,
    }),

  update: (id: string, payload: Partial<SearchEngineFormPayload>) =>
    request<SearchEngineConfig>(`/api/search-engines/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  /** 拖拽重排（与分类重排同构） */
  reorderItems: (items: { id: string; order: number }[]) =>
    request<{ success: boolean }>('/api/search-engines/reorder', {
      method: 'PATCH',
      body: { items },
    }),

  remove: (id: string) =>
    request<{ success: boolean }>(`/api/search-engines/${id}`, {
      method: 'DELETE',
    }),
};
