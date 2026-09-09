import { useCallback, useEffect, useRef, useState } from 'react';
import { iconsApi } from '@/services';

const FAVICON_FETCH_TIMEOUT_MS = 15_000;

interface UseFaviconFetcherOptions {
  sourceUrl?: string;
  fallbackSourceUrl?: string;
  /** 仅未选过图标时自动抓一次；用户修改 icon 后置为 false */
  autoFetch: boolean;
  onFetched: (url: string) => void;
  onAutoFetched: (url: string) => void;
  onFetchError: (timedOut: boolean) => void;
}

/** 封装手动与默认 favicon 抓取，统一 15 秒超时和请求取消 */
export function useFaviconFetcher({
  sourceUrl,
  fallbackSourceUrl,
  autoFetch,
  onFetched,
  onAutoFetched,
  onFetchError,
}: UseFaviconFetcherOptions) {
  const [pending, setPending] = useState<boolean>(false);
  const latestIntentRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const request = useCallback(
    async (signal: AbortSignal) => {
      if (!sourceUrl) return null;
      return iconsApi.getFavicon(
        sourceUrl,
        fallbackSourceUrl !== sourceUrl ? fallbackSourceUrl : undefined,
        { signal },
      );
    },
    [fallbackSourceUrl, sourceUrl],
  );

  const grab = useCallback(async () => {
    if (!sourceUrl) return;

    const intentToken = ++latestIntentRef.current;
    const abortController = new AbortController();
    abortRef.current = abortController;
    const timeoutTimer = setTimeout(() => {
      abortController.abort();
    }, FAVICON_FETCH_TIMEOUT_MS);
    setPending(true);

    try {
      const data = await request(abortController.signal);
      if (intentToken !== latestIntentRef.current || !data) return;
      onFetched(data.url);
    } catch {
      if (intentToken !== latestIntentRef.current) return;
      onFetchError(abortController.signal.aborted);
    } finally {
      clearTimeout(timeoutTimer);
      if (abortRef.current === abortController) abortRef.current = null;
      if (intentToken === latestIntentRef.current) setPending(false);
    }
  }, [onFetchError, onFetched, request, sourceUrl]);

  useEffect(() => {
    if (!autoFetch || !sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
      return;
    }

    const intentToken = ++latestIntentRef.current;
    const abortController = new AbortController();
    abortRef.current = abortController;
    const timer = setTimeout(() => setPending(true), 500);

    const fetchDefaultIcon = async () => {
      try {
        const data = await request(abortController.signal);
        if (intentToken !== latestIntentRef.current || !data) return;
        onAutoFetched(data.url);
      } catch {
        // 抓不到时保留首字母占位，不干扰用户填表
      } finally {
        if (intentToken === latestIntentRef.current) setPending(false);
      }
    };
    void fetchDefaultIcon();

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [autoFetch, onAutoFetched, request, sourceUrl]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { pending, grab };
}
