import { request } from '@/lib/request/request';

/** 搜索结果项 */
export interface SearchResult {
  id: string;
  name: string;
  internalUrl: string;
  externalUrl: string;
  icon: string;
  description: string | null;
  categoryId: string | null;
}

/**
 * 搜索 API service
 *
 * CmdKModal 用，按需触发（不走 SWR 缓存）
 */
export const searchApi = {
  /** 搜索卡片（名称 / URL / 描述 + 拼音 / 首字母） */
  search: (q: string) =>
    request<{ items: SearchResult[] }>(
      `/api/search?q=${encodeURIComponent(q)}`,
    ),
};
