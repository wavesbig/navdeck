'use client';

import { useToast } from '@astryxdesign/core/Toast';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BATCH_DELETE_MODE_EVENT } from '@/components/layout/card-view-events';
import { cardsApi } from '@/services/cards';

/**
 * 批量删除卡片控制器
 *
 * 从 HomeContent 抽离的状态与动作集合（控制主页组件复杂度）：
 * - 模式开关监听 FloatingToolbar 的 BATCH_DELETE_MODE_EVENT
 * - 选中集合管理与全选切换
 * - 确认删除（成功后退出模式并刷新，失败 toast 提示）
 */
export function useBatchDeleteCards(allCardIds: string[]) {
  const [active, setActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const showToast = useToast();
  const router = useRouter();

  /** 退出批量模式并清空选择（派发事件让 FloatingToolbar 同步按钮态） */
  const exit = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(BATCH_DELETE_MODE_EVENT, { detail: false }),
    );
    setActive(false);
    setSelectedIds(new Set());
  }, []);

  // 模式开关（FloatingToolbar 触发）
  useEffect(() => {
    const handler = (e: Event) => {
      const value = (e as CustomEvent<boolean>).detail;
      setActive(value);
      if (!value) setSelectedIds(new Set());
    };
    window.addEventListener(BATCH_DELETE_MODE_EVENT, handler);
    return () => window.removeEventListener(BATCH_DELETE_MODE_EVENT, handler);
  }, []);

  /** 切换一张卡片的选中态 */
  const toggle = useCallback((cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  /** 全选 / 取消全选 */
  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === allCardIds.length ? new Set() : new Set(allCardIds),
    );
  }, [allCardIds]);

  /** 确认删除：成功后退出模式并刷新，失败 toast 提示 */
  const confirmDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await cardsApi.batchDelete([...selectedIds]);
      showToast({ body: `已删除 ${selectedIds.size} 张卡片`, type: 'info' });
      exit();
      router.refresh();
    } catch {
      showToast({ body: '批量删除失败', type: 'error' });
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, exit, router, showToast]);

  return {
    active,
    selectedIds,
    deleting,
    exit,
    toggle,
    toggleAll,
    confirmDelete,
  };
}
