import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { prisma } from '@/lib/db';
import type { WidgetKey } from '@/types';
import { WIDGET_KEYS, widgetConfigUpdateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const VALID_KEYS = WIDGET_KEYS;

/** 保证 4 个 widget 都有记录（缺失的自动创建） */
async function ensureDefaults() {
  for (const [key, order] of VALID_KEYS.map((k, i) => [k, i] as const)) {
    await prisma.widgetConfig.upsert({
      where: { widgetKey: key },
      create: { widgetKey: key, enabled: true, order },
      update: {},
    });
  }
}

/**
 * Widget 配置 API
 *
 * - GET: 返回 4 个 widget 的 enabled / order
 * - PATCH: 更新单个 widget 配置
 *   - body: { widgetKey, enabled?, order? }
 */
export const GET = withAuth(async () => {
  await ensureDefaults();
  const configs = await prisma.widgetConfig.findMany({
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({
    items: configs.map((c) => ({
      widgetKey: c.widgetKey as WidgetKey,
      enabled: c.enabled,
      order: c.order,
    })),
  });
});

export const PATCH = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(widgetConfigUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  await prisma.widgetConfig.upsert({
    where: { widgetKey: data.widgetKey },
    create: {
      widgetKey: data.widgetKey,
      enabled: data.enabled ?? true,
      order: data.order ?? 0,
    },
    update: {
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });

  return NextResponse.json({ success: true });
});
