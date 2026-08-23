import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchFavicon,
  isGoogleFaviconUrl,
  parseFaviconFromHtml,
} from './favicon';

describe('parseFaviconFromHtml', () => {
  it('解析 <link rel="icon">', () => {
    const html = `<html><head><link rel="icon" href="/favicon.ico"></head><body></body></html>`;
    expect(parseFaviconFromHtml(html, 'https://example.com')).toBe(
      'https://example.com/favicon.ico',
    );
  });

  it('解析 <link rel="shortcut icon">', () => {
    const html = `<html><head><link rel="shortcut icon" href="/shortcut.ico"></head>`;
    expect(parseFaviconFromHtml(html, 'https://example.com')).toBe(
      'https://example.com/shortcut.ico',
    );
  });

  it('解析 <link rel="apple-touch-icon"> 优先级最高', () => {
    const html = `<html><head>
      <link rel="icon" href="/icon.ico">
      <link rel="apple-touch-icon" href="/apple.png">
    </head>`;
    expect(parseFaviconFromHtml(html, 'https://example.com')).toBe(
      'https://example.com/apple.png',
    );
  });

  it('相对路径基于 baseUrl 解析为绝对 URL', () => {
    const html = `<html><head><link rel="icon" href="assets/favicon.ico"></head>`;
    // URL 标准行为：相对路径基于 baseUrl 的目录解析，sub/page 的目录是 sub/
    expect(parseFaviconFromHtml(html, 'https://example.com/sub/page')).toBe(
      'https://example.com/sub/assets/favicon.ico',
    );
  });

  it('已经是绝对 URL 时直接返回', () => {
    const html = `<html><head><link rel="icon" href="https://cdn.example.com/icon.png"></head>`;
    expect(parseFaviconFromHtml(html, 'https://example.com')).toBe(
      'https://cdn.example.com/icon.png',
    );
  });

  it('解析 favicon 时移除目标地址中的账号密码', () => {
    const html = `<html><head><link rel="icon" href="/favicon.ico"></head>`;
    expect(
      parseFaviconFromHtml(html, 'http://user:pass@192.168.1.10:8080'),
    ).toBe('http://192.168.1.10:8080/favicon.ico');
  });

  it('没有 <link rel="icon"> 时 fallback 到 /favicon.ico', () => {
    const html = `<html><head><title>No Icon</title></head>`;
    expect(parseFaviconFromHtml(html, 'https://example.com')).toBe(
      'https://example.com/favicon.ico',
    );
  });

  it('无效 HTML 不抛错，返回 fallback', () => {
    expect(parseFaviconFromHtml('', 'https://example.com')).toBe(
      'https://example.com/favicon.ico',
    );
  });
});

describe('fetchFavicon', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('从 HTML 解析到 favicon 时返回 source=html', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          `<html><head><link rel="icon" href="/favicon.ico"></head>`,
      }),
    );
    const result = await fetchFavicon('https://example.com');
    expect(result).toEqual({
      url: 'https://example.com/favicon.ico',
      source: 'html',
    });
  });

  it('fetch 失败时 fallback 到目标站点 /favicon.ico', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = await fetchFavicon('https://example.com');
    expect(result).toEqual({
      url: 'https://example.com/favicon.ico',
      source: 'direct',
    });
  });

  it('fallback 图标地址不包含目标地址中的账号密码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(
      fetchFavicon('http://user:pass@192.168.1.10:8080'),
    ).resolves.toEqual({
      url: 'http://192.168.1.10:8080/favicon.ico',
      source: 'direct',
    });
  });

  it('内网地址获取失败时同样返回内网 favicon 地址', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(fetchFavicon('http://192.168.5.44:9527')).resolves.toEqual({
      url: 'http://192.168.5.44:9527/favicon.ico',
      source: 'direct',
    });
  });

  it('HTML 中没有 favicon 时 fallback 到根 /favicon.ico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => `<html><head><title>No Icon</title></head>`,
      }),
    );
    const result = await fetchFavicon('https://example.com/sub/page');
    // HTML 中没找到 link rel=icon 时，parseFaviconFromHtml 返回根 /favicon.ico
    expect(result).not.toBeNull();
    expect(result?.source).toBe('html');
    expect(result?.url).toBe('https://example.com/favicon.ico');
  });

  it('无效 URL 返回 null', async () => {
    const result = await fetchFavicon('not-a-url');
    expect(result).toBeNull();
  });
});

describe('isGoogleFaviconUrl', () => {
  it('识别 Google S2 存量图标', () => {
    expect(
      isGoogleFaviconUrl(
        'https://www.google.com/s2/favicons?domain=192.168.5.44&sz=64',
      ),
    ).toBe(true);
    expect(
      isGoogleFaviconUrl(
        'https://www.google.com/s2/favicons?domain=example.com&sz=64',
      ),
    ).toBe(true);
  });

  it('目标站点 favicon 不是待清理图标', () => {
    expect(isGoogleFaviconUrl('https://example.com/favicon.ico')).toBe(false);
  });
});
