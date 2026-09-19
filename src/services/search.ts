import { request } from '@/lib/request/request';
import type { SearchHit } from '@/lib/search';

export type { SearchHit };

/**
 * 搜索 API service
 *
 * CmdKModal / 主页搜索直达用，按需触发（不走 SWR 缓存）
 */
export const searchApi = {
  /** 搜索卡片（名称 / URL / 描述 + 拼音 / 首字母） */
  search: (q: string) =>
    request<{ items: SearchHit[] }>(`/api/search?q=${encodeURIComponent(q)}`),
};
