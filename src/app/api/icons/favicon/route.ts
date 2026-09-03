import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { fetchFavicon } from '@/lib/favicon';

export const dynamic = 'force-dynamic';

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

  const result = await fetchFavicon(targetUrl);
  if (fallbackUrl && fallbackUrl !== targetUrl) {
    const fallbackResult = await fetchFavicon(fallbackUrl);
    if (fallbackResult) {
      return NextResponse.json(fallbackResult);
    }
  }
  if (!result) {
    return NextResponse.json({ error: '无法获取 favicon' }, { status: 404 });
  }

  return NextResponse.json(result);
});
