import type { z } from 'zod';
import { request } from '@/lib/request/request';
import { categoryCreateSchema } from '@/lib/validation';
import type { Category } from '@/types';

type CategoryFormValues = z.infer<typeof categoryCreateSchema>;

/**
 * 分类 API service
 *
 * 列表读取由主页 SSR 通过 prisma 直接拉取（app/page.tsx），不走 SWR。
 * 此 service 仅封装写操作。
 */
export const categoriesApi = {
  /** 新建分类 */
  create: (body: CategoryFormValues) =>
    request<Category>('/api/categories', { method: 'POST', body }),

  /** 更新分类 */
  update: (id: string, body: Partial<CategoryFormValues>) =>
    request<Category>(`/api/categories/${id}`, { method: 'PATCH', body }),

  /** 删除分类（关联卡片 categoryId 置空） */
  delete: (id: string) =>
    request<void>(`/api/categories/${id}`, { method: 'DELETE' }),

  /** 分类重排 */
  reorder: (items: { id: string; order: number }[]) =>
    request<void>('/api/categories/reorder', {
      method: 'PATCH',
      body: { items },
    }),
};
