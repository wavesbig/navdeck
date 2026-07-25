'use client';

import {useState, useEffect, useCallback} from 'react';
import type {CardStatus} from '@/types';

interface UseCardStatusesResult {
  statuses: Record<string, CardStatus>;
  isLoading: boolean;
  refresh: () => void;
  /** 单卡片刷新（点击卡片时触发） */
  refreshOne: (cardId: string) => void;
}

/**
 * 卡片状态灯 hook
 *
 * - 进入页面时调 /api/cards/status 批量探测
 * - 监听 window 'network-mode-change' 事件，切换模式后重新探测
 * - refreshOne 用于点击卡片时 fire-and-forget 单卡片探测
 */
export function useCardStatuses(): UseCardStatusesResult {
  const [statuses, setStatuses] = useState<Record<string, CardStatus>>({});
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cards/status', {cache: 'no-store'});
      if (!res.ok) return;
      const data = (await res.json()) as {items: {id: string; status: CardStatus}[]};
      const map: Record<string, CardStatus> = {};
      for (const item of data.items) {
        map[item.id] = item.status;
      }
      setStatuses(map);
    } catch (e) {
      console.error('批量探测状态失败', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshOne = useCallback(async (cardId: string) => {
    try {
      const res = await fetch(`/api/cards/${cardId}/status`, {cache: 'no-store'});
      if (!res.ok) return;
      const data = (await res.json()) as {id: string; status: CardStatus};
      setStatuses((prev) => ({...prev, [data.id]: data.status}));
    } catch (e) {
      console.error('单卡片探测失败', e);
    }
  }, []);

  // 进入页面探测一次
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/cards/status', {cache: 'no-store'});
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {items: {id: string; status: CardStatus}[]};
        if (cancelled) return;
        const map: Record<string, CardStatus> = {};
        for (const item of data.items) {
          map[item.id] = item.status;
        }
        setStatuses(map);
      } catch (e) {
        console.error('批量探测状态失败', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 网络模式切换时重新探测
  useEffect(() => {
    const handler = () => {
      void refresh();
    };
    window.addEventListener('network-mode-change', handler);
    return () => window.removeEventListener('network-mode-change', handler);
  }, [refresh]);

  return {statuses, isLoading, refresh, refreshOne};
}
