import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { dateItemCreateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * 实例的日期项 API
 *
 * - GET: 列出实例的所有日期项
 * - POST: 为实例新增日期项（widgetKey 从实例读取，body 不传）
 */
export const GET = withAuth(async (_session, _req, ctx) => {
  const { id } = await ctx.params;

  const items = await prisma.dateItem.findMany({
    where: { instanceId: id },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      instanceId: item.instanceId,
      widgetKey: item.widgetKey,
      name: item.name,
      date: item.date.toISOString(),
      recurUnit: item.recurUnit,
      createdAt: item.createdAt.toISOString(),
    })),
  });
});

export const POST = withAuth(async (_session, req, ctx) => {
  const { id } = await ctx.params;

  // 校验实例存在并取 widgetKey
  const instance = await prisma.widgetInstance.findUnique({
    where: { id },
    select: { widgetKey: true },
  });
  if (!instance) {
    return NextResponse.json({ error: '实例不存在' }, { status: 404 });
  }

  const existingCount = await prisma.dateItem.count({
    where: { instanceId: id },
  });
  if (existingCount > 0) {
    return NextResponse.json(
      { error: '每个日期卡片只支持一个日期' },
      { status: 409 },
    );
  }

  const body = await req.json();
  // 覆盖 body 中的 widgetKey 和 instanceId，以路径为准
  const parsed = validateBody(dateItemCreateSchema, {
    ...body,
    widgetKey: instance.widgetKey,
  });
  if (!parsed.ok) return parsed.response;
  const { name, date, recurUnit } = parsed.data;

  // 循环仅对倒数日生效，正数日不循环
  if (instance.widgetKey === 'countup' && recurUnit) {
    return NextResponse.json({ error: '正数日不支持循环' }, { status: 400 });
  }

  const item = await prisma.dateItem.create({
    data: {
      instanceId: id,
      widgetKey: instance.widgetKey,
      name,
      date: new Date(date),
      recurUnit: recurUnit ?? null,
    },
  });

  return NextResponse.json({
    id: item.id,
    instanceId: item.instanceId,
    widgetKey: item.widgetKey,
    name: item.name,
    date: item.date.toISOString(),
    recurUnit: item.recurUnit,
    createdAt: item.createdAt.toISOString(),
  });
});
