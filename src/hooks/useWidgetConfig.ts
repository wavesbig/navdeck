'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { preferencesApi } from '@/services/preferences';
import { type WidgetConfigItem, widgetsApi } from '@/services/widgets';
import type { WidgetKey, WidgetLayout } from '@/types';

interface UseWidgetConfigResult {
  configs: WidgetConfigItem[];
  layout: WidgetLayout;
  isLoading: boolean;
  toggleWidget: (key: WidgetKey, enabled: boolean) => Promise<void>;
  reorderWidgets: (newOrder: WidgetKey[]) => Promise<void>;
  setLayout: (layout: WidgetLayout) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Widget 配置 hook
 *
 * - useSWR 拉取 widget 配置 + 首选项（layout）
 * - mutation 后乐观更新
 */
export function useWidgetConfig(): UseWidgetConfigResult {
  const {
    data: cfgData,
    isLoading: cfgLoading,
    mutate: cfgMutate,
  } = useSWR(widgetsApi.configKey, widgetsApi.getConfig);
  const { data: prefData, mutate: prefMutate } = useSWR(
    preferencesApi.getKey,
    preferencesApi.get,
  );

  // 错误由 errorMiddleware 统一处理（toast / 401 跳转），业务层不重复 console.error

  const configs = (cfgData?.items ?? [])
    .slice()
    .sort((a, b) => a.order - b.order);
  const layout: WidgetLayout = prefData?.widgetLayout ?? 1;
  const isLoading = cfgLoading && !cfgData;

  const toggleWidget = useCallback(
    async (key: WidgetKey, enabled: boolean) => {
      // 乐观更新
      await cfgMutate(
        (prev) => {
          if (!prev) return prev;
          return {
            items: prev.items.map((c) =>
              c.widgetKey === key ? { ...c, enabled } : c,
            ),
          };
        },
        { revalidate: false },
      );
      try {
        await widgetsApi.updateConfig({ widgetKey: key, enabled });
      } catch (e) {
        console.error('切换 widget 配置失败', e);
        await cfgMutate(); // 回滚：重新拉取
      }
    },
    [cfgMutate],
  );

  const reorderWidgets = useCallback(
    async (newOrder: WidgetKey[]) => {
      // 乐观更新
      await cfgMutate(
        (prev) => {
          if (!prev) return prev;
          const map = new Map(prev.items.map((c) => [c.widgetKey, c]));
          return {
            items: newOrder
              .map((key, idx) => {
                const c = map.get(key);
                return c ? { ...c, order: idx } : null;
              })
              .filter((c): c is WidgetConfigItem => c !== null),
          };
        },
        { revalidate: false },
      );
      await Promise.all(
        newOrder.map((key, idx) =>
          widgetsApi.updateConfig({ widgetKey: key, order: idx }),
        ),
      );
    },
    [cfgMutate],
  );

  const setLayout = useCallback(
    async (newLayout: WidgetLayout) => {
      // 乐观更新
      await prefMutate(
        (prev) => (prev ? { ...prev, widgetLayout: newLayout } : prev),
        { revalidate: false },
      );
      try {
        await preferencesApi.update('widgetLayout', newLayout);
      } catch (e) {
        console.error('切换 widget 栏布局失败', e);
        await prefMutate();
      }
    },
    [prefMutate],
  );

  const refresh = useCallback(async () => {
    await Promise.all([cfgMutate(), prefMutate()]);
  }, [cfgMutate, prefMutate]);

  return {
    configs,
    layout,
    isLoading,
    toggleWidget,
    reorderWidgets,
    setLayout,
    refresh,
  };
}
