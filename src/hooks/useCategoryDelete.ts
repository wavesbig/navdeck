'use client';

import { useToast } from '@astryxdesign/core/Toast';
import { useState } from 'react';
import { ApiError } from '@/lib/request/ApiError';
import { categoriesApi } from '@/services/categories';
import type { Category } from '@/types';

interface UseCategoryDeleteOptions {
  /** 删除成功后的副作用（调用方自行决定：刷新页面 / 过滤本地列表） */
  onSuccess?: (category: Category) => void;
}

/**
 * 删除分类共享流程（主页编辑模式与设置页共用）
 *
 * 封装确认弹窗状态 + 删除 API + 统一错误提示；描述文案由
 * pendingCategory 派生（含卡片数提示），避免第二数据源漂移。
 * 弹窗渲染使用配套的 DeleteCategoryDialog 组件。
 */
export function useCategoryDelete({ onSuccess }: UseCategoryDeleteOptions) {
  const showToast = useToast();
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** 请求删除（打开确认弹窗） */
  const requestDelete = (category: Category) => setPendingCategory(category);

  /** 取消删除（删除进行中不可关闭） */
  const cancelDelete = () => {
    if (!deleting) setPendingCategory(null);
  };

  /** 确认删除：调 API → 清状态 → 执行调用方副作用 */
  const confirmDelete = async () => {
    if (!pendingCategory || deleting) return;
    const category = pendingCategory;
    setDeleting(true);
    try {
      await categoriesApi.delete(category.id);
      setPendingCategory(null);
      onSuccess?.(category);
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        showToast({ body: '网络错误', type: 'error' });
      } else if (err instanceof ApiError) {
        const data = err.data as { error?: string } | undefined;
        showToast({ body: data?.error ?? '删除失败', type: 'error' });
      } else {
        showToast({ body: '删除失败', type: 'error' });
      }
    } finally {
      setDeleting(false);
    }
  };

  /** 确认弹窗描述文案（由 pendingCategory 派生） */
  const description = (() => {
    if (!pendingCategory) return '';
    const cardCount = pendingCategory.cards?.length ?? 0;
    return cardCount > 0
      ? `确认删除分类「${pendingCategory.name}」吗？该分类下 ${cardCount} 张卡片会归到未分类。`
      : `确认删除分类「${pendingCategory.name}」吗？`;
  })();

  return {
    pendingCategory,
    deleting,
    description,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
