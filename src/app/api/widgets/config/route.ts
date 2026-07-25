import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';
import type {WidgetKey} from '@/types';

export const dynamic = 'force-dynamic';

const VALID_KEYS: WidgetKey[] = ['nas-status', 'resource-gauge', 'countdown', 'countup'];

/** 保证 4 个 widget 都有记录（缺失的自动创建） */
async function ensureDefaults() {
  for (const [key, order] of VALID_KEYS.map((k, i) => [k, i] as const)) {
    await prisma.widgetConfig.upsert({
      where: {widgetKey: key},
      create: {widgetKey: key, enabled: true, order},
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
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  await ensureDefaults();
  const configs = await prisma.widgetConfig.findMany({
    orderBy: {order: 'asc'},
  });

  return NextResponse.json({
    items: configs.map((c) => ({
      widgetKey: c.widgetKey as WidgetKey,
      enabled: c.enabled,
      order: c.order,
    })),
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const body = (await req.json()) as {
    widgetKey: string;
    enabled?: boolean;
    order?: number;
  };

  if (!body.widgetKey || !VALID_KEYS.includes(body.widgetKey as WidgetKey)) {
    return NextResponse.json({error: '无效 widget key'}, {status: 400});
  }

  const widgetKey = body.widgetKey as WidgetKey;
  await prisma.widgetConfig.upsert({
    where: {widgetKey},
    create: {
      widgetKey,
      enabled: body.enabled ?? true,
      order: body.order ?? 0,
    },
    update: {
      ...(body.enabled !== undefined && {enabled: body.enabled}),
      ...(body.order !== undefined && {order: body.order}),
    },
  });

  return NextResponse.json({success: true});
}
