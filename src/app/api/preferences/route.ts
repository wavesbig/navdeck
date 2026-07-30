import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import { preferencesUpdateSchema } from '@/lib/validation';
import type { NetworkMode } from '@/types';

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
  const parsed = validateBody(preferencesUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { key, value } = parsed.data;

  await setUserPreference(key, value);
  return NextResponse.json({ success: true });
});
