import { ApiError } from './ApiError';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
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
  const { method = 'GET', body, signal, headers: customHeaders = {} } = opts;
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
    });
  } catch {
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
