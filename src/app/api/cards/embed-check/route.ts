import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { resolveEmbeddingStatus } from '@/lib/embedding';

export const dynamic = 'force-dynamic';

/** 从代理头还原 NavDeck 自身 origin，用于判断 SAMEORIGIN / 'self' */
function requestOrigin(req: Request): string {
  const forwardedHost = req.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();
  const host = forwardedHost || req.headers.get('host');
  const forwardedProto = req.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();
  const protocol = forwardedProto ?? new URL(req.url).protocol.replace(':', '');
  return host ? `${protocol}://${host}` : new URL(req.url).origin;
}

/**
 * 卡片嵌入预检
 *
 * GET /api/cards/embed-check?url=...
 * 读取目标站点响应头，提前识别 X-Frame-Options / CSP frame-ancestors。
 * 这里不代理页面内容，也不尝试绕过浏览器安全策略。
 */
export const GET = withAuth(async (_session, req) => {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url')?.trim();
  if (!targetUrl) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }

  const target = safeHttpUrl(targetUrl);
  if (!target) {
    return NextResponse.json({ error: '无效的 URL' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  let response: Response;
  try {
    response = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    await response.body?.cancel();
  } catch {
    return NextResponse.json({ status: 'unknown' });
  } finally {
    clearTimeout(timer);
  }

  return NextResponse.json({
    status: resolveEmbeddingStatus({
      targetUrl: response.url || targetUrl,
      appOrigin: requestOrigin(req),
      xFrameOptions: response.headers.get('x-frame-options'),
      contentSecurityPolicy: response.headers.get('content-security-policy'),
    }),
  });
});

function safeHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
