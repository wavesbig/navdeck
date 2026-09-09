import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type FaviconResult, fetchFavicon } from '@/lib/favicon';

const ICON_UPLOAD_ROOT = join(process.cwd(), 'data', 'uploads', 'icons');
const MAX_ICON_SIZE = 5 * 1024 * 1024;
const USER_AGENT = 'NavDeck/0.1 (+https://github.com/navdeck)';

const ICON_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

/** 用户可能直接粘贴 /images/icon.png 这类图片地址 */
export function isDirectIconUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'].some((ext) =>
      pathname.endsWith(ext),
    );
  } catch {
    return false;
  }
}

/**
 * 把 favicon 保存为站内文件。
 *
 * 内网 favicon 绝对链接只有浏览器在内网时能加载；保存副本后，
 * 外网访问 NavDeck 也能通过已登录的 /api/icons/file 正常显示。
 */
export async function cacheFavicon(url: string): Promise<string | null> {
  try {
    const parsedUrl = new URL(url);
    // HTML 中的 icon href 可能指向任意协议；服务端缓存只允许安全 HTTP 地址
    if (
      !['http:', 'https:'].includes(parsedUrl.protocol) ||
      parsedUrl.hostname === '169.254.169.254' ||
      parsedUrl.hostname === 'metadata.google.internal'
    ) {
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });

    const contentType =
      res.headers.get('content-type')?.split(';')[0]?.toLowerCase() ?? '';
    const extension = ICON_MIME_EXTENSIONS[contentType];
    if (!res.ok || !extension) {
      clearTimeout(timer);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    clearTimeout(timer);
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_ICON_SIZE) {
      return null;
    }

    const targetDir = join(ICON_UPLOAD_ROOT, 'cards');
    await mkdir(targetDir, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(targetDir, filename), buffer);

    return `/api/icons/file?path=cards/${filename}`;
  } catch {
    return null;
  }
}

/** 抓取并缓存 favicon；只有拿到本地副本才算成功 */
export async function fetchCachedFavicon(
  targetUrl: string,
  fallbackUrl?: string,
): Promise<FaviconResult | null> {
  if (isDirectIconUrl(targetUrl)) {
    const cachedUrl = await cacheFavicon(targetUrl);
    if (cachedUrl) return { url: cachedUrl, source: 'direct' };
  }

  const targetResult = await fetchFavicon(targetUrl);
  if (targetResult) {
    const cachedUrl = await cacheFavicon(targetResult.url);
    if (cachedUrl) return { ...targetResult, url: cachedUrl };
  }

  // 内网源失败或图标无法缓存时，才付出外网兜底的等待成本
  if (!fallbackUrl || fallbackUrl === targetUrl) return null;
  const fallbackResult = await fetchFavicon(fallbackUrl);
  if (!fallbackResult) return null;

  const fallbackCachedUrl = await cacheFavicon(fallbackResult.url);
  if (!fallbackCachedUrl) return null;

  return { ...fallbackResult, url: fallbackCachedUrl };
}
