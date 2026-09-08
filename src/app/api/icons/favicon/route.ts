import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import type { FaviconResult } from '@/lib/favicon';
import { fetchFavicon } from '@/lib/favicon';

export const dynamic = 'force-dynamic';

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
function isDirectIconUrl(url: string): boolean {
  try {
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'].includes(
      extname(new URL(url).pathname).toLowerCase(),
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
async function cacheFavicon(url: string): Promise<string | null> {
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
    if (!res.ok || !extension) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_ICON_SIZE) {
      return null;
    }
    clearTimeout(timer);

    const targetDir = join(ICON_UPLOAD_ROOT, 'cards');
    await mkdir(targetDir, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(targetDir, filename), buffer);

    return `/api/icons/file?path=cards/${filename}`;
  } catch {
    return null;
  }
}

/** 目标地址优先；只有缓存失败时才尝试外网兜底 */
async function resolveCachedFavicon(
  targetUrl: string,
  fallbackUrl?: string,
): Promise<FaviconResult | null> {
  if (isDirectIconUrl(targetUrl)) {
    const cachedUrl = await cacheFavicon(targetUrl);
    if (cachedUrl) return { url: cachedUrl, source: 'direct' };
  }

  const targetResult = await fetchFavicon(targetUrl);
  const fallbackResult =
    fallbackUrl && fallbackUrl !== targetUrl
      ? await fetchFavicon(fallbackUrl)
      : null;

  for (const result of [targetResult, fallbackResult]) {
    if (!result) continue;
    const cachedUrl = await cacheFavicon(result.url);
    if (cachedUrl) return { ...result, url: cachedUrl };
  }

  if (targetResult) return targetResult;
  return fallbackResult;
}

/**
 * favicon 抓取 API
 *
 * GET /api/icons/favicon?url=https://example.com
 * GET /api/icons/favicon?url=http://192.168.1.10&fallbackUrl=https://app.example.com
 *
 * 返回：{ url, source }
 *  - source: 'html' = 解析自 HTML；'direct' = 目标站点 /favicon.ico
 */
export const GET = withAuth(async (_session, req) => {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url')?.trim();
  const fallbackUrl = searchParams.get('fallbackUrl')?.trim();

  if (!targetUrl) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }

  try {
    // 校验是合法 URL
    new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: '无效的 URL' }, { status: 400 });
  }

  const result = await resolveCachedFavicon(targetUrl, fallbackUrl);
  if (!result) {
    return NextResponse.json({ error: '无法获取 favicon' }, { status: 404 });
  }

  return NextResponse.json(result);
});
