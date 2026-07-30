'use client';

import { useCallback, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { cardsApi } from '@/services/cards';
import type { CardStatus, CardStatusResult } from '@/types';

interface UseCardStatusesResult {
  statuses: Record<string, CardStatus>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** 单卡片刷新（点击卡片时触发，乐观更新） */
  refreshOne: (cardId: string) => Promise<void>;
}

/**
 * 卡片状态灯 hook
 *
 * - useSWR 拉取批量状态
 * - 监听 'network-mode-change' 事件触发 mutate
 * - refreshOne 用乐观更新（局部 mutate）
 */
export function useCardStatuses(): UseCardStatusesResult {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR(cardsApi.statusKey, cardsApi.listStatuses);

  useEffect(() => {
    if (!error) return;
    console.error('批量探测状态失败', error);
  }, [error]);

  const statuses = useMemo(() => {
    const map: Record<string, CardStatus> = {};
    data?.items.forEach((i: CardStatusResult) => {
      map[i.id] = i.status;
    });
    return map;
  }, [data]);

  const refresh = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  const refreshOne = useCallback(
    async (cardId: string) => {
      try {
        const result = await cardsApi.getStatus(cardId);
        // 局部 mutate：只更新单卡片状态，不重新请求
        await swrMutate(
          (prev) => {
            if (!prev) return prev;
            return {
              items: prev.items.map((i) =>
                i.id === cardId ? { ...i, status: result.status } : i,
              ),
            };
          },
          { revalidate: false },
        );
      } catch (e) {
        console.error('单卡片探测失败', e);
      }
    },
    [swrMutate],
  );

  // 网络模式切换时重新探测
  useEffect(() => {
    const handler = () => {
      void swrMutate();
    };
    window.addEventListener('network-mode-change', handler);
    return () => window.removeEventListener('network-mode-change', handler);
  }, [swrMutate]);

  return { statuses, isLoading, refresh, refreshOne };
}
