import { request } from '@/lib/request/request';
import type { Preferences } from './widgets';

/**
 * 用户首选项 API service
 *
 * 写操作后用 mutate(preferencesApi.getKey) 重新验证
 */
export const preferencesApi = {
  /** SWR key：所有首选项 */
  getKey: '/api/preferences' as const,

  /** 读取所有首选项（单个对象，非数组） */
  get: () => request<Preferences>('/api/preferences'),

  /** 更新单个首选项 */
  update: <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    request<void>('/api/preferences', {
      method: 'PATCH',
      body: { key, value },
    }),
};
