import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { DEFAULT_BRAND_CONFIG, getBrandConfig } from '@/lib/brand';
import { normalizeFontSize } from '@/lib/font-size';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import {
  preferencesUpdateSchema,
  validatePreferenceValue,
} from '@/lib/validation';
import type { NetworkMode } from '@/types';
import { FONT_SIZE_DEFAULT } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 用户首选项 API
 *
 * - GET: 读取所有首选项（networkMode / theme / fontSize / searchEngine / brand）
 * - PATCH: 更新单个首选项（body: { key, value })
 */
export const GET = withAuth(async () => {
  const [
    networkMode,
    theme,
    rawFontSize,
    searchEngine,
    brand,
    cardSimpleMode,
    cardStatusBadge,
  ] = await Promise.all([
    getUserPreference<NetworkMode>('networkMode', 'auto'),
    getUserPreference<'light' | 'dark' | 'system'>('theme', 'system'),
    getUserPreference<unknown>('fontSize', FONT_SIZE_DEFAULT),
    getUserPreference<string>('searchEngine', 'google'),
    getBrandConfig(),
    getUserPreference<boolean>('cardSimpleMode', false),
    getUserPreference<boolean>('cardStatusBadge', true),
  ]);

  return NextResponse.json({
    networkMode,
    theme,
    fontSize: normalizeFontSize(rawFontSize),
    searchEngine,
    brand: brand ?? DEFAULT_BRAND_CONFIG,
    cardSimpleMode,
    cardStatusBadge,
  });
});

export const PATCH = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(preferencesUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { key, value } = parsed.data;

  // 已知 key 的值校验（未注册的 key 直接通过，如 lucky 结构在 service 层管理）
  if (!validatePreferenceValue(key, value)) {
    return NextResponse.json({ error: '偏好值不合法' }, { status: 400 });
  }

  await setUserPreference(key, value);
  if (key === 'brand') revalidatePath('/', 'layout');
  return NextResponse.json({ success: true });
});
