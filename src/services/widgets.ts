import { request } from '@/lib/request/request';
import type {
  DateItem,
  DockerStats,
  WidgetBarWidth,
  WidgetInstance,
  WidgetKey,
  WidgetLibraryItem,
  WidgetSize,
} from '@/types';

/** 日期项 API 响应体（与 DateItem 等价，但 widgetKey 字段严格限定） */
export type DateItemResponse = DateItem;

// re-export 类型供消费者使用
export type { DockerStats, WidgetInstance, WidgetLibraryItem };

/** 用户首选项（/api/preferences 响应体） */
export interface Preferences {
  networkMode: 'auto' | 'internal' | 'external';
  theme: 'light' | 'dark' | 'system';
  searchEngine: string;
  /** Widget 栏宽度（px），默认 360 */
  widgetBarWidth: WidgetBarWidth;
  /** 当前壁纸 id（null 表示使用默认壁纸） */
  wallpaper: string | null;
}

/**
 * Widget API service（多实例模型）
 *
 * - 实例 CRUD：/api/widgets/instances
 * - 日期项 CRUD：/api/widgets/instances/:id/items（每个实例独立）
 * - Widget 库：/api/widgets/library
 * - Docker 数据：/api/widgets/docker
 */
export const widgetsApi = {
  // ============ 实例 ============

  /** SWR key：所有实例 */
  instancesKey: '/api/widgets/instances' as const,
  listInstances: (_key?: string, opts: { signal?: AbortSignal } = {}) =>
    request<{ items: WidgetInstance[] }>('/api/widgets/instances', {
      signal: opts?.signal,
    }),
  createInstance: (body: {
    widgetKey: WidgetKey;
    size?: WidgetSize;
    order?: number;
  }) =>
    request<WidgetInstance>('/api/widgets/instances', {
      method: 'POST',
      body,
    }),
  updateInstance: (id: string, body: { size?: WidgetSize; order?: number }) =>
    request<WidgetInstance>(`/api/widgets/instances/${id}`, {
      method: 'PATCH',
      body,
    }),
  deleteInstance: (id: string) =>
    request<void>(`/api/widgets/instances/${id}`, { method: 'DELETE' }),

  // ============ Widget 库 ============

  /** SWR key：widget 库（可添加类型） */
  libraryKey: '/api/widgets/library' as const,
  listLibrary: (_key?: string, opts: { signal?: AbortSignal } = {}) =>
    request<{ items: WidgetLibraryItem[] }>('/api/widgets/library', {
      signal: opts?.signal,
    }),

  // ============ 日期项（按实例 id） ============

  /** SWR key：实例的日期项 */
  dateItemsKey: (instanceId: string) =>
    `/api/widgets/instances/${instanceId}/items` as const,
  listDateItems: (instanceId: string, opts?: { signal?: AbortSignal }) =>
    request<{ items: DateItemResponse[] }>(
      `/api/widgets/instances/${instanceId}/items`,
      { signal: opts?.signal },
    ),
  createDateItem: (
    instanceId: string,
    body: { name: string; date: string; recurring?: boolean },
  ) =>
    request<DateItemResponse>(`/api/widgets/instances/${instanceId}/items`, {
      method: 'POST',
      body,
    }),
  updateDateItem: (
    instanceId: string,
    itemId: string,
    body: Partial<{ name: string; date: string; recurring: boolean }>,
  ) =>
    request<DateItemResponse>(
      `/api/widgets/instances/${instanceId}/items/${itemId}`,
      { method: 'PATCH', body },
    ),
  deleteDateItem: (instanceId: string, itemId: string) =>
    request<void>(`/api/widgets/instances/${instanceId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  // ============ Docker 数据 ============

  /** SWR key：Docker 数据 */
  dockerKey: '/api/widgets/docker' as const,
  getDockerStats: (_key?: string, opts: { signal?: AbortSignal } = {}) =>
    request<DockerStats>('/api/widgets/docker', { signal: opts?.signal }),
};
