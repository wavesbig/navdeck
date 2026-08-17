'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { widgetsApi } from '@/services/widgets';
import type { DateItem } from '@/types';

interface UseDateItemsResult {
  items: DateItem[];
  isLoading: boolean;
  /** 拉取失败标记（区分「真空」和「加载失败」，空卡片自弃时防止误删） */
  isError: boolean;
  refresh: () => Promise<void>;
  addItem: (input: {
    name: string;
    date: string;
    recurUnit?: 'week' | 'month' | 'year' | null;
  }) => Promise<void>;
  updateItem: (
    id: string,
    input: Partial<{
      name: string;
      date: string;
      recurUnit: 'week' | 'month' | 'year' | null;
    }>,
  ) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

/**
 * 日期项 CRUD hook（按 widget 实例 id 获取，倒数日 / 正数日共用）
 *
 * - useSWR 拉取数据
 * - mutation 后乐观更新（局部 mutate，不重新请求）
 */
export function useDateItems(instanceId: string): UseDateItemsResult {
  const {
    data,
    isLoading,
    error,
    mutate: swrMutate,
  } = useSWR(
    // 乐观新增的实例使用 temp- 前缀临时 id，此时不拉取（等真实 id 替换后再请求）
    instanceId.startsWith('temp-') ? null : widgetsApi.dateItemsKey(instanceId),
    (_url: string, { signal }: { signal?: AbortSignal } = {}) =>
      widgetsApi.listDateItems(instanceId, { signal }),
  );

  // 错误由 errorMiddleware 统一处理

  const items = useMemo(() => {
    if (!data) return [];
    return data.items.slice().sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const addItem = useCallback(
    async (input: {
      name: string;
      date: string;
      recurUnit?: 'week' | 'month' | 'year' | null;
    }) => {
      const created = await widgetsApi.createDateItem(instanceId, input);
      await swrMutate(
        (prev) => {
          if (!prev) return prev;
          return { items: [...prev.items, created] };
        },
        { revalidate: false },
      );
    },
    [instanceId, swrMutate],
  );

  const updateItem = useCallback(
    async (
      id: string,
      input: Partial<{
        name: string;
        date: string;
        recurUnit: 'week' | 'month' | 'year' | null;
      }>,
    ) => {
      const updated = await widgetsApi.updateDateItem(instanceId, id, input);
      await swrMutate(
        (prev) => {
          if (!prev) return prev;
          return {
            items: prev.items.map((it) => (it.id === id ? updated : it)),
          };
        },
        { revalidate: false },
      );
    },
    [instanceId, swrMutate],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await widgetsApi.deleteDateItem(instanceId, id);
      await swrMutate(
        (prev) => {
          if (!prev) return prev;
          return { items: prev.items.filter((it) => it.id !== id) };
        },
        { revalidate: false },
      );
    },
    [instanceId, swrMutate],
  );

  const refresh = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  return {
    items,
    isLoading,
    isError: !!error,
    refresh,
    addItem,
    updateItem,
    deleteItem,
  };
}
