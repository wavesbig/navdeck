import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './ApiError';
import { request, swrFetcher } from './request';

/**
 * request 测试
 *
 * 通过 vi.stubGlobal 替换全局 fetch，覆盖：
 * - 2xx 正常返回 JSON
 * - 204 返回 undefined
 * - 非 2xx 抛 ApiError（含 status / data）
 * - 网络错误抛 ApiError(status=0)
 * - FormData 不设置 Content-Type: application/json
 * - body 自动 JSON.stringify
 * - swrFetcher 透传 signal
 */

type FetchMock = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock as unknown as FetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('request - 成功响应', () => {
  it('GET 默认请求返回 JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: 1 }));
    const data = await request<{ ok: number }>('/api/test');
    expect(data).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('GET');
    expect(init?.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  });

  it('204 返回 undefined', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 } as Response);
    const data = await request<void>('/api/test', { method: 'DELETE' });
    expect(data).toBeUndefined();
  });

  it('body 自动 JSON.stringify 并设置 Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 1 }));
    await request('/api/cards', { method: 'POST', body: { name: 'foo' } });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe(JSON.stringify({ name: 'foo' }));
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('FormData 不设置 Content-Type 且原样透传 body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { path: '/x' }));
    const fd = new FormData();
    fd.append('file', new Blob(['x']), 'a.png');
    await request('/api/icons/upload', { method: 'POST', body: fd });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe(fd);
    expect(
      (init?.headers as Record<string, string>)?.['Content-Type'],
    ).toBeUndefined();
  });

  it('自定义 headers 合并到默认 headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await request('/api/test', { headers: { 'X-Custom': 'yes' } });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Custom': 'yes',
    });
  });

  it('透传 signal', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    const ctrl = new AbortController();
    await request('/api/test', { signal: ctrl.signal });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.signal).toBe(ctrl.signal);
  });
});

describe('request - 错误响应', () => {
  it('非 2xx 抛 ApiError 含 status / data / message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { error: '参数错误', fieldErrors: { name: ['必填'] } }),
    );
    await expect(request('/api/test')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: '参数错误',
    });
    try {
      await request('/api/test');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).fieldErrors).toEqual({ name: ['必填'] });
    }
  });

  it('响应体非 JSON 时 message 兜底为"请求失败"', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);
    await expect(request('/api/test')).rejects.toMatchObject({
      status: 500,
      message: '请求失败',
    });
  });

  it('fetch 抛异常时转为 ApiError(status=0)', async () => {
    fetchMock.mockRejectedValue(new TypeError('failed to fetch'));
    await expect(request('/api/test')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: '网络错误，请检查网络连接',
    });
  });

  it('401 响应可通过 isUnauthorized 判定', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: '未登录' }));
    try {
      await request('/api/test');
    } catch (e) {
      expect((e as ApiError).isUnauthorized).toBe(true);
    }
  });
});

describe('swrFetcher', () => {
  it('单参数时透传给 request', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: 1 }));
    const data = await swrFetcher<{ ok: number }>('/api/test');
    expect(data).toEqual({ ok: 1 });
  });

  it('带 signal 参数时透传给 request', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: 1 }));
    const ctrl = new AbortController();
    await swrFetcher('/api/test', { signal: ctrl.signal });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.signal).toBe(ctrl.signal);
  });

  it('opts 为空对象时等价于无 opts', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: 1 }));
    await swrFetcher('/api/test', {});
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
