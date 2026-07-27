import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import type { NetworkMode } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 用户首选项 API
 *
 * - GET: 读取所有首选项（networkMode / theme / searchEngine / widgetLayout）
 * - PATCH: 更新单个首选项（body: { key, value }）
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const [networkMode, theme, searchEngine, widgetLayout] = await Promise.all([
    getUserPreference<NetworkMode>('networkMode', 'auto'),
    getUserPreference<'light' | 'dark' | 'system'>('theme', 'system'),
    getUserPreference<string>('searchEngine', 'google'),
    getUserPreference<1 | 2>('widgetLayout', 1),
  ]);

  return NextResponse.json({
    networkMode,
    theme,
    searchEngine,
    widgetLayout,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = (await req.json()) as { key: string; value: unknown };
  if (!body.key || body.value === undefined) {
    return NextResponse.json({ error: '无效参数' }, { status: 400 });
  }

  await setUserPreference(body.key, body.value);
  return NextResponse.json({ success: true });
}
