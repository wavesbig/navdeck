'use client';

import {useState, useEffect, useCallback} from 'react';
import type {WidgetKey, WidgetLayout} from '@/types';

interface WidgetConfigItem {
  widgetKey: WidgetKey;
  enabled: boolean;
  order: number;
}

interface UseWidgetConfigResult {
  configs: WidgetConfigItem[];
  layout: WidgetLayout;
  isLoading: boolean;
  toggleWidget: (key: WidgetKey, enabled: boolean) => Promise<void>;
  reorderWidgets: (newOrder: WidgetKey[]) => Promise<void>;
  setLayout: (layout: WidgetLayout) => Promise<void>;
  refresh: () => void;
}

/**
 * Widget 配置 hook
 *
 * - 首次挂载时拉取数据
 * - setState 在 fetch 回调中调用（异步），避免 effect 中同步 setState
 */
export function useWidgetConfig(): UseWidgetConfigResult {
  const [configs, setConfigs] = useState<WidgetConfigItem[]>([]);
  const [layout, setLayoutState] = useState<WidgetLayout>(1);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [cfgRes, prefRes] = await Promise.all([
        fetch('/api/widgets/config', {cache: 'no-store'}),
        fetch('/api/preferences', {cache: 'no-store'}),
      ]);
      if (cfgRes.ok) {
        const data = (await cfgRes.json()) as {items: WidgetConfigItem[]};
        setConfigs(data.items.sort((a, b) => a.order - b.order));
      }
      if (prefRes.ok) {
        const pref = (await prefRes.json()) as {widgetLayout?: WidgetLayout};
        setLayoutState(pref.widgetLayout ?? 1);
      }
    } catch (e) {
      console.error('Widget 配置拉取失败', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 首次挂载拉取，setState 在 async 回调中（异步），不违反规则
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cfgRes, prefRes] = await Promise.all([
          fetch('/api/widgets/config', {cache: 'no-store'}),
          fetch('/api/preferences', {cache: 'no-store'}),
        ]);
        if (cancelled) return;
        if (cfgRes.ok) {
          const data = (await cfgRes.json()) as {items: WidgetConfigItem[]};
          if (!cancelled) setConfigs(data.items.sort((a, b) => a.order - b.order));
        }
        if (prefRes.ok) {
          const pref = (await prefRes.json()) as {widgetLayout?: WidgetLayout};
          if (!cancelled) setLayoutState(pref.widgetLayout ?? 1);
        }
      } catch (e) {
        console.error('Widget 配置拉取失败', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleWidget = useCallback(async (key: WidgetKey, enabled: boolean) => {
    setConfigs((prev) =>
      prev.map((c) => (c.widgetKey === key ? {...c, enabled} : c))
    );
    try {
      await fetch('/api/widgets/config', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({widgetKey: key, enabled}),
      });
    } catch (e) {
      console.error('切换 widget 配置失败', e);
    }
  }, []);

  const reorderWidgets = useCallback(async (newOrder: WidgetKey[]) => {
    setConfigs((prev) =>
      newOrder
        .map((key) => prev.find((c) => c.widgetKey === key))
        .filter((c): c is WidgetConfigItem => c !== undefined)
        .map((c, idx) => ({...c, order: idx}))
    );
    await Promise.all(
      newOrder.map((key, idx) =>
        fetch('/api/widgets/config', {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({widgetKey: key, order: idx}),
        })
      )
    );
  }, []);

  const setLayout = useCallback(async (newLayout: WidgetLayout) => {
    setLayoutState(newLayout);
    try {
      await fetch('/api/preferences', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({key: 'widgetLayout', value: newLayout}),
      });
    } catch (e) {
      console.error('切换 widget 栏布局失败', e);
    }
  }, []);

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
