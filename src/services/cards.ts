import { request } from '@/lib/request/request';
import type { CardFormValues } from '@/lib/validation';
import type { Card, CardStatusResult } from '@/types';

/**
 * 卡片 API service
 *
 * 列表读取由主页 SSR 通过 prisma 直接拉取（app/page.tsx），不走 SWR。
 * 此 service 仅封装写操作和状态探测。
 */
export const cardsApi = {
  /** 新建卡片 */
  create: (body: CardFormValues) =>
    request<Card>('/api/cards', { method: 'POST', body }),

  /** 更新卡片 */
  update: (id: string, body: Partial<CardFormValues>) =>
    request<Card>(`/api/cards/${id}`, { method: 'PATCH', body }),

  /** 删除卡片 */
  delete: (id: string) =>
    request<void>(`/api/cards/${id}`, { method: 'DELETE', keepalive: true }),

  /** 批量删除卡片 */
  batchDelete: (ids: string[]) =>
    request<{ success: true; deleted: number }>('/api/cards/batch-delete', {
      method: 'POST',
      body: { ids },
    }),

  /** SWR key：卡片状态批量探测 */
  statusKey: '/api/cards/status' as const,

  /** 卡片状态批量探测 */
  listStatuses: (_key?: string, opts: { signal?: AbortSignal } = {}) =>
    request<{ items: CardStatusResult[] }>('/api/cards/status', {
      signal: opts?.signal,
    }),

  /** 单卡片状态探测 */
  getStatus: (id: string) =>
    request<CardStatusResult>(`/api/cards/${id}/status`),

  /** SWR key：卡片重排 */
  reorderKey: '/api/cards/reorder' as const,

  /** 卡片重排 */
  reorder: (
    items: { id: string; order: number; categoryId: string | null }[],
  ) =>
    request<void>('/api/cards/reorder', { method: 'PATCH', body: { items } }),
};
