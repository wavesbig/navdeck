import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLuckyExternalUrl, fetchLuckyRules } from './lucky';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchLuckyRules', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('调用官方规则接口并标准化主/子规则', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ret: 0,
        ruleList: [
          {
            RuleKey: 'rule-1',
            Enable: true,
            DefaultProxy: null,
            ProxyList: [
              {
                Key: 'sub-1',
                Remark: 'Alist',
                WebServiceType: '',
                Enable: true,
                Domains: ['', 'alist.example.com'],
                Locations: ['', 'http://192.168.1.10:5244'],
              },
              {
                Key: 'sub-2',
                WebServiceType: 'url',
                Enable: true,
                Domains: ['jump.example.com'],
                Locations: ['http://192.168.1.11:3000'],
              },
              {
                Key: 'sub-3',
                Enable: false,
                WebServiceType: 'fileServer',
                Domains: ['file.example.com'],
                Locations: ['http://192.168.1.12:8080'],
              },
            ],
          },
          {
            RuleKey: '',
            Enable: true,
            ProxyList: [
              {
                Key: 'invalid',
                Domains: ['invalid.example.com'],
                Locations: ['http://192.168.1.13:9090'],
              },
            ],
          },
          {
            RuleKey: 'rule-disabled',
            Enable: false,
            ProxyList: [
              {
                Key: 'sub-disabled',
                Enable: true,
                WebServiceType: '',
                Domains: ['disabled.example.com'],
                Locations: ['http://192.168.1.14:9090'],
              },
            ],
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const rules = await fetchLuckyRules(
      'http://127.0.0.1:16601/',
      'test-token',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:16601/api/webservice/rules',
      expect.objectContaining({
        headers: { openToken: 'test-token' },
        cache: 'no-store',
      }),
    );
    expect(rules).toEqual([
      {
        ruleId: 'rule-1:sub-1',
        name: 'Alist',
        frontendDomain: 'alist.example.com',
        backendLocation: 'http://192.168.1.10:5244',
        serviceType: 'reverseproxy',
      },
      {
        ruleId: 'rule-1:sub-2',
        name: '',
        frontendDomain: 'jump.example.com',
        backendLocation: 'http://192.168.1.11:3000',
        serviceType: 'urljump',
      },
    ]);
  });

  it('Lucky 返回非 0 时抛出业务错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ ret: -1, msg: 'login invalid' })),
    );

    await expect(
      fetchLuckyRules('http://127.0.0.1:16601', 'test-token'),
    ).rejects.toThrow('Lucky API 错误: login invalid');
  });

  it('HTTP 非 2xx 时抛出响应错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));

    await expect(
      fetchLuckyRules('http://127.0.0.1:16601', 'test-token'),
    ).rejects.toThrow('Lucky API 响应错误: 500');
  });

  it('响应体读取超时会终止请求', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => ({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            );
          }),
      })),
    );

    const rejection = expect(
      fetchLuckyRules('http://127.0.0.1:16601', 'test-token'),
    ).rejects.toThrow('Lucky API 请求超时');
    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
  });

  it('拒绝非 http/https 的后台地址', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchLuckyRules('ftp://127.0.0.1:16601', 'test-token'),
    ).rejects.toThrow('Lucky 后台地址仅支持 http/https');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('buildLuckyExternalUrl', () => {
  it('域名未带端口时继承 Lucky 后台地址端口', () => {
    expect(
      buildLuckyExternalUrl('qb.wavesbig.cn', 'https://lucky.wavesbig.cn:9527'),
    ).toBe('https://qb.wavesbig.cn:9527');
  });

  it('优先保留规则域名自带端口', () => {
    expect(
      buildLuckyExternalUrl(
        'qb.wavesbig.cn:8443',
        'https://lucky.wavesbig.cn:9527',
      ),
    ).toBe('https://qb.wavesbig.cn:8443');
  });

  it('支持完整域名 URL 且默认端口不重复追加', () => {
    expect(
      buildLuckyExternalUrl(
        'https://qb.wavesbig.cn',
        'https://lucky.wavesbig.cn',
      ),
    ).toBe('https://qb.wavesbig.cn');
  });
});
