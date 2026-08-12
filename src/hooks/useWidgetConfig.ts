'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { preferencesApi } from '@/services/preferences';
import { widgetsApi } from '@/services/widgets';
import type {
  WidgetBarWidth,
  WidgetInstance,
  WidgetKey,
  WidgetSize,
} from '@/types';

interface UseWidgetInstancesResult {
  /** 所有 widget 实例（按 order 排序） */
  instances: WidgetInstance[];
  barWidth: WidgetBarWidth;
  isLoading: boolean;
  /** 添加实例（添加到末尾），成功返回新实例，失败返回 null */
  addInstance: (
    widgetKey: WidgetKey,
    size?: WidgetSize,
  ) => Promise<WidgetInstance | null>;
  /** 可撤销删除：乐观更新移除，返回 undo/commit 回调（配合 useUndoableDelete） */
  removeInstanceDeferred: (id: string) => {
    undo: () => void;
    commit: () => Promise<void>;
  };
  /** 重排实例 */
  reorderInstances: (newOrder: string[]) => Promise<void>;
  /** 更新实例尺寸 */
  setInstanceSize: (id: string, size: WidgetSize) => Promise<void>;
  setBarWidth: (width: WidgetBarWidth) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Widget 实例 hook（多实例模型）
 *
 * - useSWR 拉取实例列表 + 首选项（layout / barWidth）
 * - mutation 后乐观更新
 */
export function useWidgetInstances(): UseWidgetInstancesResult {
  const {
    data: instData,
    isLoading: instLoading,
    mutate: instMutate,
  } = useSWR(widgetsApi.instancesKey, widgetsApi.listInstances);
  const { data: prefData, mutate: prefMutate } = useSWR(
    preferencesApi.getKey,
    preferencesApi.get,
  );

  // 错误由 errorMiddleware 统一处理

  const instances = (instData?.items ?? [])
    .slice()
    .sort((a, b) => a.order - b.order);
  const barWidth: WidgetBarWidth = prefData?.widgetBarWidth ?? 360;
  const isLoading = instLoading && !instData;

  const addInstance = useCallback(
    async (widgetKey: WidgetKey, size: WidgetSize = 'M') => {
      // 乐观更新：先 append 到末尾
      const tempId = `temp-${Date.now()}`;
      await instMutate(
        (prev) => {
          if (!prev) return prev;
          const nextOrder =
            prev.items.length > 0
              ? Math.max(...prev.items.map((i) => i.order)) + 1
              : 0;
          return {
            items: [
              ...prev.items,
              {
                id: tempId,
                widgetKey,
                order: nextOrder,
                size,
              },
            ],
          };
        },
        { revalidate: false },
      );
      try {
        const created = await widgetsApi.createInstance({ widgetKey, size });
        // 用真实 id 替换 tempId
        await instMutate(
          (prev) => {
            if (!prev) return prev;
            return {
              items: prev.items.map((i) => (i.id === tempId ? created : i)),
            };
          },
          { revalidate: false },
        );
        return created;
      } catch (e) {
        console.error('添加 widget 实例失败', e);
        await instMutate(); // 回滚
        return null;
      }
    },
    [instMutate],
  );

  /** 可撤销删除：乐观更新移除，返回 undo/commit 回调 */
  const removeInstanceDeferred = useCallback(
    (id: string): { undo: () => void; commit: () => Promise<void> } => {
      const prev = instData;
      instMutate(
        (cur) => (cur ? { items: cur.items.filter((i) => i.id !== id) } : cur),
        { revalidate: false },
      );
      return {
        undo: () => instMutate(prev, { revalidate: false }),
        commit: async () => {
          try {
            await widgetsApi.deleteInstance(id);
          } catch (e) {
            console.error('删除 widget 实例失败', e);
            instMutate(prev, { revalidate: false });
          }
        },
      };
    },
    [instData, instMutate],
  );

  const reorderInstances = useCallback(
    async (newOrder: string[]) => {
      // 乐观更新
      await instMutate(
        (prev) => {
          if (!prev) return prev;
          const map = new Map(prev.items.map((i) => [i.id, i]));
          return {
            items: newOrder
              .map((id, idx) => {
                const inst = map.get(id);
                return inst ? { ...inst, order: idx } : null;
              })
              .filter((i): i is WidgetInstance => i !== null),
          };
        },
        { revalidate: false },
      );
      await Promise.all(
        newOrder.map((id, idx) =>
          widgetsApi.updateInstance(id, { order: idx }),
        ),
      );
    },
    [instMutate],
  );

  const setInstanceSize = useCallback(
    async (id: string, size: WidgetSize) => {
      // 乐观更新
      await instMutate(
        (prev) => {
          if (!prev) return prev;
          return {
            items: prev.items.map((i) => (i.id === id ? { ...i, size } : i)),
          };
        },
        { revalidate: false },
      );
      try {
        await widgetsApi.updateInstance(id, { size });
      } catch (e) {
        console.error('更新 widget 尺寸失败', e);
        await instMutate();
      }
    },
    [instMutate],
  );

  const setBarWidth = useCallback(
    async (newWidth: WidgetBarWidth) => {
      await prefMutate(
        (prev) => (prev ? { ...prev, widgetBarWidth: newWidth } : prev),
        { revalidate: false },
      );
      try {
        await preferencesApi.update('widgetBarWidth', newWidth);
      } catch (e) {
        console.error('切换 widget 栏宽度失败', e);
        await prefMutate();
      }
    },
    [prefMutate],
  );

  const refresh = useCallback(async () => {
    await Promise.all([instMutate(), prefMutate()]);
  }, [instMutate, prefMutate]);

  return {
    instances,
    barWidth,
    isLoading,
    addInstance,
    removeInstanceDeferred,
    reorderInstances,
    setInstanceSize,
    setBarWidth,
    refresh,
  };
}
