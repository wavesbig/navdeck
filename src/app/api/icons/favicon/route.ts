import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import type { FaviconResult } from '@/lib/favicon';
import { fetchCachedFavicon } from '@/lib/favicon-cache';

export const dynamic = 'force-dynamic';

/** 目标地址优先；只有缓存失败时才尝试外网兜底 */
async function resolveCachedFavicon(
  targetUrl: string,
  fallbackUrl?: string,
): Promise<FaviconResult | null> {
  return fetchCachedFavicon(targetUrl, fallbackUrl);
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
