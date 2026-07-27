import { URL } from 'node:url';
import * as cheerio from 'cheerio';

/**
 * favicon 抓取工具
 *
 * 抓取流程：
 * 1. fetch 目标 URL 的 HTML
 * 2. cheerio 解析 <link rel="icon" / "shortcut icon" / "apple-touch-icon">
 * 3. 取第一个匹配的 href，解析为绝对 URL
 * 4. fallback：Google S2 favicon 服务（https://www.google.com/s2/favicons?domain=xxx&sz=64）
 *
 * 离线场景：fetch 失败时返回 null，由前端展示占位符
 */

const FETCH_TIMEOUT_MS = 5000;
const USER_AGENT = 'NavDeck/0.1 (+https://github.com/navdeck)';

/** favicon 抓取结果 */
export interface FaviconResult {
  /** favicon 绝对 URL（已解析） */
  url: string;
  /** 来源：html = 解析自 HTML；google = Google S2 fallback */
  source: 'html' | 'google';
}

/**
 * 从 URL 中提取 hostname
 */
function extractHostname(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

/**
 * 抓取指定 URL 的 favicon
 *
 * @param targetUrl 目标站点 URL（如 https://jellyfin.example.com）
 * @returns favicon URL，失败返回 null
 */
export async function fetchFavicon(
  targetUrl: string,
): Promise<FaviconResult | null> {
  const hostname = extractHostname(targetUrl);
  if (!hostname) return null;

  // 1. 尝试解析 HTML 中的 <link rel="icon">
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (res.ok) {
      const html = await res.text();
      const faviconUrl = parseFaviconFromHtml(html, targetUrl);
      if (faviconUrl) {
        return { url: faviconUrl, source: 'html' };
      }
    }
  } catch {
    // 离线或目标站点不可达，继续 fallback
  }

  // 2. fallback：Google S2 favicon 服务
  return {
    url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
    source: 'google',
  };
}

/**
 * 从 HTML 中解析 favicon URL
 *
 * 优先级：apple-touch-icon > icon > shortcut icon
 *
 * 导出供单元测试使用
 */
export function parseFaviconFromHtml(
  html: string,
  baseUrl: string,
): string | null {
  const $ = cheerio.load(html);

  // 按 rel 属性优先级查找
  const rels = ['apple-touch-icon', 'icon', 'shortcut icon', 'mask-icon'];

  for (const rel of rels) {
    const link = $(`link[rel="${rel}"]`).first();
    const href = link.attr('href');
    if (href) {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        // href 无法解析为 URL，跳过
      }
    }
  }

  // 最后尝试 /favicon.ico
  try {
    return new URL('/favicon.ico', baseUrl).toString();
  } catch {
    return null;
  }
}
