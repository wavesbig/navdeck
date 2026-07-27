'use client';

import { useEffect, useRef, useState } from 'react';
import type { DockerResourceSummary, DockerStatusSummary } from '@/types';

interface DockerStats {
  available: boolean;
  status: DockerStatusSummary;
  resource: DockerResourceSummary;
}

interface UseDockerStatsResult extends DockerStats {
  isLoading: boolean;
}

const INITIAL: DockerStats = {
  available: false,
  status: { running: 0, total: 0, stopped: 0 },
  resource: {
    cpuPercent: 0,
    memoryPercent: 0,
    diskReadBytesPerSec: 0,
    diskWriteBytesPerSec: 0,
  },
};

/**
 * Docker 数据 hook
 * - 首次挂载时拉取一次
 * - 每 30 秒自动刷新
 */
export function useDockerStats(refreshMs = 30_000): UseDockerStatsResult {
  const [stats, setStats] = useState<DockerStats>(INITIAL);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const res = await fetch('/api/widgets/docker', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as DockerStats;
        if (!cancelled) {
          setStats(data);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Docker 数据拉取失败', e);
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchOnce();
    timerRef.current = setInterval(fetchOnce, refreshMs);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshMs]);

  return { ...stats, isLoading };
}
