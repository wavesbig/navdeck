import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import type { NetworkMode } from '@/types';
import { preferenceUpdateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * 用户首选项 API
 *
 * - GET: 读取所有首选项（networkMode / theme / searchEngine / widgetLayout）
 * - PATCH: 更新单个首选项（body: { key, value })
 */
export const GET = withAuth(async () => {
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
});

export const PATCH = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(preferenceUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { key, value } = parsed.data;

  await setUserPreference(key, value);
  return NextResponse.json({ success: true });
});
