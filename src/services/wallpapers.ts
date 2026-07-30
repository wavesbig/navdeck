import { request } from '@/lib/request/request';
import type { Wallpaper } from '@/types';

/**
 * 壁纸 API service
 *
 * 当前壁纸 id 通过 preferencesApi.getKey（GET /api/preferences）读取，
 * 此 service 仅封装上传/删除操作。
 */
export const wallpapersApi = {
  /** 上传壁纸（FormData） */
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<Wallpaper>('/api/wallpapers/upload', {
      method: 'POST',
      body: formData,
    });
  },

  /** 删除壁纸 */
  delete: (id: string) =>
    request<void>(`/api/wallpapers/${id}`, { method: 'DELETE' }),
};
