import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFavicon, parseFaviconFromHtml } from './favicon';

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

  it('fetch 失败时 fallback 到 Google S2', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = await fetchFavicon('https://example.com');
    expect(result?.source).toBe('google');
    expect(result?.url).toContain('google.com/s2/favicons');
    expect(result?.url).toContain('domain=example.com');
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
