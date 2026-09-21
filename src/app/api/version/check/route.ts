import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { checkForUpdate } from '@/lib/version-check';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

/**
 * 版本更新检测 API
 *
 * - GET: 服务端请求 GitHub Releases（24h 节流，结果缓存于 UserPreference）
 * - ?force=1: 跳过节流（设置页「立即检查」按钮）
 */
export const GET = withAuth(async (_session, req) => {
  const force = new URL(req.url).searchParams.get('force') === '1';
  const result = await checkForUpdate(force);
  return NextResponse.json(result, { headers: NO_STORE_HEADERS });
});
