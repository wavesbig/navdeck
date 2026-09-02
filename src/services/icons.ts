import { request } from '@/lib/request/request';

/**
 * 图标 API service
 */
export const iconsApi = {
  /** favicon 抓取 */
  getFavicon: (url: string) =>
    request<{ url: string; source: 'html' | 'direct' }>(
      `/api/icons/favicon?url=${encodeURIComponent(url)}`,
    ),

  /** 图标库目录 */
  getLibrary: () =>
    request<{
      items: { name: string; label: string; url: string }[];
    }>('/api/icons/library'),

  /** 上传图标（FormData） */
  upload: (file: File, scope: 'cards' | 'library' | 'brand' = 'cards') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scope', scope);
    return request<{ path: string }>('/api/icons/upload', {
      method: 'POST',
      body: formData,
    });
  },

  /** 删除上传的图标 */
  delete: (path: string) =>
    request<void>(`/api/icons/upload?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    }),
};
