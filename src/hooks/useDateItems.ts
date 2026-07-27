'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DateItem, DateItemWidgetKey } from '@/types';

interface UseDateItemsResult {
  items: DateItem[];
  isLoading: boolean;
  refresh: () => void;
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

/**
 * 日期项 CRUD hook（倒数日 / 正数日共用）
 *
 * - 拉取数据使用 ref 避免在 effect 中直接 setState
 * - 操作后本地立即更新，无需重新拉取
 */
export function useDateItems(widgetKey: DateItemWidgetKey): UseDateItemsResult {
  const [items, setItems] = useState<DateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/widgets/countdown?key=${widgetKey}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { items: DateItem[] };
      setItems(data.items);
    } catch (e) {
      console.error('日期项拉取失败', e);
    } finally {
      setIsLoading(false);
    }
  }, [widgetKey]);

  useEffect(() => {
    mountedRef.current = true;
    // 首次挂载拉取数据
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/widgets/countdown?key=${widgetKey}`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { items: DateItem[] };
        if (!cancelled) {
          setItems(data.items);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('日期项拉取失败', e);
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [widgetKey]);

  const addItem = useCallback(
    async (input: { name: string; date: string; recurring?: boolean }) => {
      const res = await fetch('/api/widgets/countdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetKey, ...input }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '新增失败');
      }
      const created = (await res.json()) as DateItem;
      setItems((prev) =>
        [...prev, created].sort((a, b) => a.date.localeCompare(b.date)),
      );
    },
    [widgetKey],
  );

  const updateItem = useCallback(
    async (
      id: string,
      input: Partial<{ name: string; date: string; recurring: boolean }>,
    ) => {
      const res = await fetch(`/api/widgets/countdown/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '更新失败');
      }
      const updated = (await res.json()) as DateItem;
      setItems((prev) =>
        prev
          .map((it) => (it.id === id ? updated : it))
          .sort((a, b) => a.date.localeCompare(b.date)),
      );
    },
    [],
  );

  const deleteItem = useCallback(async (id: string) => {
    const res = await fetch(`/api/widgets/countdown/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '删除失败');
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  return { items, isLoading, refresh, addItem, updateItem, deleteItem };
}
