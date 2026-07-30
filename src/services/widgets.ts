import { request } from '@/lib/request/request';
import type { WidgetKey } from '@/types';

/** Docker widget 数据（/api/widgets/docker 响应体） */
export interface DockerStats {
  available: boolean;
  status: { running: number; total: number; stopped: number };
  resource: {
    cpuPercent: number;
    memoryPercent: number;
    diskReadBytesPerSec: number;
    diskWriteBytesPerSec: number;
  };
}

/** Widget 配置项 */
export interface WidgetConfigItem {
  widgetKey: WidgetKey;
  enabled: boolean;
  order: number;
}

/** 日期项（API 返回结构） */
export interface DateItemResponse {
  id: string;
  widgetKey: 'countdown' | 'countup';
  name: string;
  date: string;
  recurring: boolean;
}

/** 用户首选项（/api/preferences 响应体） */
export interface Preferences {
  networkMode: 'auto' | 'internal' | 'external';
  theme: 'light' | 'dark' | 'system';
  searchEngine: string;
  widgetLayout: 1 | 2;
  /** 当前壁纸 id（null 表示使用默认壁纸） */
  wallpaper: string | null;
}

/**
 * Widget API service
 */
export const widgetsApi = {
  /** SWR key：widget 配置 */
  configKey: '/api/widgets/config' as const,
  getConfig: () =>
    request<{ items: WidgetConfigItem[] }>('/api/widgets/config'),
  updateConfig: (body: {
    widgetKey: WidgetKey;
    enabled?: boolean;
    order?: number;
  }) => request<void>('/api/widgets/config', { method: 'PATCH', body }),

  /** SWR key：Docker 数据 */
  dockerKey: '/api/widgets/docker' as const,
  getDockerStats: () => request<DockerStats>('/api/widgets/docker'),

  /** SWR key：日期项（按 widgetKey 区分） */
  dateItemsKey: (widgetKey: 'countdown' | 'countup') =>
    `/api/widgets/countdown?key=${widgetKey}` as const,
  listDateItems: (widgetKey: 'countdown' | 'countup') =>
    request<{ items: DateItemResponse[] }>(
      `/api/widgets/countdown?key=${widgetKey}`,
    ),
  createDateItem: (body: {
    widgetKey: 'countdown' | 'countup';
    name: string;
    date: string;
    recurring?: boolean;
  }) =>
    request<DateItemResponse>('/api/widgets/countdown', {
      method: 'POST',
      body,
    }),
  updateDateItem: (id: string, body: Partial<DateItemResponse>) =>
    request<DateItemResponse>(`/api/widgets/countdown/${id}`, {
      method: 'PATCH',
      body,
    }),
  deleteDateItem: (id: string) =>
    request<void>(`/api/widgets/countdown/${id}`, { method: 'DELETE' }),
};
