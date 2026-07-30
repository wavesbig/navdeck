import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Card } from '@/types';
import { probeUrl, probeUrls, resolveAutoUrl } from './network';

function makeCard(
  overrides: Partial<Card> = {},
): Pick<Card, 'internalUrl' | 'externalUrl'> {
  return {
    internalUrl: 'http://192.168.1.10:8096',
    externalUrl: 'https://jellyfin.example.com',
    ...overrides,
  };
}

describe('resolveAutoUrl', () => {
  it('外网可达时返回外网', () => {
    const result = resolveAutoUrl(makeCard(), {
      internal: true,
      external: true,
    });
    expect(result.source).toBe('external');
  });

  it('外网不可达但内网可达时返回内网', () => {
    const result = resolveAutoUrl(makeCard(), {
      internal: true,
      external: false,
    });
    expect(result.source).toBe('internal');
    expect(result.url).toBe('http://192.168.1.10:8096');
  });

  it('内外网都不可达时兜底外网', () => {
    const result = resolveAutoUrl(makeCard(), {
      internal: false,
      external: false,
    });
    expect(result.source).toBe('external');
  });
});

describe('probeUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetch 返回 ok=true 时返回 true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
    expect(await probeUrl('http://example.com', 500)).toBe(true);
  });

  it('fetch 抛出异常时返回 false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await probeUrl('http://example.com', 500)).toBe(false);
  });

  it('HEAD 返回 405 时回退到 GET', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    expect(await probeUrl('http://example.com', 500)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].method).toBe('HEAD');
    expect(fetchMock.mock.calls[1][1].method).toBe('GET');
  });
});

describe('probeUrls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('并发探测多个 URL，结果按顺序返回', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 }),
    );
    const results = await probeUrls(
      ['http://a.com', 'http://b.com', 'http://c.com'],
      { timeoutMs: 500, concurrency: 3 },
    );
    expect(results).toEqual([true, false, true]);
  });

  it('空数组返回空结果', async () => {
    const results = await probeUrls([]);
    expect(results).toEqual([]);
  });
});
