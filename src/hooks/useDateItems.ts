'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { type DateItemResponse, widgetsApi } from '@/services/widgets';
import type { DateItem, DateItemWidgetKey } from '@/types';

interface UseDateItemsResult {
  items: DateItem[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  addItem: (input: {
    name: string;
    date: string;
    recurring?: boolean;
  }) => Promise<void>;
  updateItem: (
    id: string,
    input: Partial<{ name: string; date: string; recurring: boolean }>,
  ) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

const sortItems = (items: DateItemResponse[]): DateItem[] =>
  items
    .map((it) => ({ ...it, widgetKey: it.widgetKey as DateItemWidgetKey }))
    .sort((a, b) => a.date.localeCompare(b.date));

/**
 * 日期项 CRUD hook（倒数日 / 正数日共用）
 *
 * - useSWR 拉取数据
 * - mutation 后乐观更新（局部 mutate，不重新请求）
 */
export function useDateItems(widgetKey: DateItemWidgetKey): UseDateItemsResult {
  const {
    data,
    isLoading,
    mutate: swrMutate,
  } = useSWR(widgetsApi.dateItemsKey(widgetKey), (_url: string, { signal }: { signal?: AbortSignal } = {}) =>
    widgetsApi.listDateItems(widgetKey, { signal }),
  );

  // 错误由 errorMiddleware 统一处理（toast / 401 跳转），业务层不重复 console.error

  const items = useMemo(() => (data ? sortItems(data.items) : []), [data]);

  const addItem = useCallback(
    async (input: { name: string; date: string; recurring?: boolean }) => {
      const created = await widgetsApi.createDateItem({ widgetKey, ...input });
      await swrMutate(
        (prev) => {
          if (!prev) return prev;
          return { items: [...prev.items, created] };
        },
        { revalidate: false },
      );
    },
    [widgetKey, swrMutate],
  );

  const updateItem = useCallback(
    async (
      id: string,
      input: Partial<{ name: string; date: string; recurring: boolean }>,
    ) => {
      const updated = await widgetsApi.updateDateItem(id, input);
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
    [swrMutate],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await widgetsApi.deleteDateItem(id);
      await swrMutate(
        (prev) => {
          if (!prev) return prev;
          return { items: prev.items.filter((it) => it.id !== id) };
        },
        { revalidate: false },
      );
    },
    [swrMutate],
  );

  const refresh = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  return { items, isLoading, refresh, addItem, updateItem, deleteItem };
}
