import { ApiError } from './ApiError';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** fetch keepalive：页面卸载时仍能把请求发完（undoable delete 的 pagehide flush 用） */
  keepalive?: boolean;
}

/**
 * 页面卸载标记（仅客户端）
 *
 * 页面刷新/关闭时，浏览器会中断所有进行中的 fetch 请求，此时 fetch 抛出的是
 * TypeError("Failed to fetch") 而非 AbortError，且 signal.aborted 仍为 false。
 * 用 pagehide / beforeunload 事件标记卸载状态，在 catch 中据此区分。
 */
let isUnloading = false;
if (typeof window !== 'undefined') {
  const markUnloading = () => {
    isUnloading = true;
  };
  window.addEventListener('pagehide', markUnloading);
  window.addEventListener('beforeunload', markUnloading);
  // bfcache 恢复时复位（用户点后退按钮时 pagehide 已触发但页面未真正卸载）
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) isUnloading = false;
  });
}

/**
 * 统一 fetch 封装
 *
 * - 自动注入 Accept + Content-Type（FormData 除外）
 * - 非 2xx 抛 ApiError（含 status / data）
 * - 网络错误（fetch 本身抛异常）抛 ApiError(status=0)
 * - 204 返回 undefined
 *
 * 给 SWR 用：`useSWR(key, (url, { signal }) => request(url, { signal }))`
 * 给写操作用：`request('/api/cards', { method: 'POST', body })`
 */
export async function request<T>(
  url: string,
  opts: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    signal,
    headers: customHeaders = {},
    keepalive,
  } = opts;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...customHeaders,
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
      signal,
      cache: 'no-store',
      keepalive,
    });
  } catch (err) {
    // 请求被取消（页面刷新/卸载/SWR 取消）：标记为 abort，业务层跳过
    // - AbortError：SWR 主动取消（signal.abort()）
    // - isUnloading：页面刷新/关闭时浏览器中断 fetch（抛 TypeError，signal.aborted 仍为 false）
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError' || signal?.aborted === true || isUnloading) {
      throw new ApiError('请求已取消', -1);
    }
    throw new ApiError('网络错误，请检查网络连接', 0);
  }

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = undefined;
    }
    const message =
      (data as { error?: string } | undefined)?.error ?? '请求失败';
    throw new ApiError(message, res.status, data);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * SWR 默认 fetcher
 *
 * 用法：`<SWRConfig value={{ fetcher: swrFetcher }}>`
 * 组件层 `useSWR('/api/cards')` 自动调此 fetcher。
 */
export function swrFetcher<T>(url: string): Promise<T>;
export function swrFetcher<T>(
  url: string,
  { signal }: { signal?: AbortSignal },
): Promise<T>;
export function swrFetcher<T>(
  url: string,
  opts?: { signal?: AbortSignal },
): Promise<T> {
  return request<T>(url, opts ?? {});
}
