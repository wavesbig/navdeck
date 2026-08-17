import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { widgetInstanceCreateSchema } from '@/lib/validation';
import type { WidgetKey } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Widget 实例 API（多实例）
 *
 * - GET: 列出所有 widget 实例（按 order 排序）
 * - POST: 创建新实例 { widgetKey, size?, order?, initialItem? }
 *   日期类 widget（countdown/countup）必须带 initialItem（schema 强制），
 *   实例与首个日期项在同一次 create 中原子落库，不会产生空实例
 */
export const GET = withAuth(async () => {
  const instances = await prisma.widgetInstance.findMany({
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({
    items: instances.map((i) => ({
      id: i.id,
      widgetKey: i.widgetKey as WidgetKey,
      order: i.order,
      size: i.size as 'S' | 'M' | 'L',
    })),
  });
});

export const POST = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(widgetInstanceCreateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { widgetKey, size, order, initialItem } = parsed.data;

  // 新实例的 order 默认为「末尾」
  let nextOrder = order;
  if (nextOrder === undefined) {
    const max = await prisma.widgetInstance.aggregate({
      _max: { order: true },
    });
    nextOrder = (max._max.order ?? -1) + 1;
  }

  const instance = await prisma.widgetInstance.create({
    data: {
      widgetKey,
      size: size ?? 'M',
      order: nextOrder,
      // 嵌套 create 与实例同事务落库（schema 已保证日期类必带 initialItem）
      ...(initialItem && {
        dateItems: {
          create: {
            widgetKey,
            name: initialItem.name,
            date: new Date(initialItem.date),
            recurUnit: initialItem.recurUnit ?? null,
          },
        },
      }),
    },
  });

  return NextResponse.json({
    id: instance.id,
    widgetKey: instance.widgetKey as WidgetKey,
    order: instance.order,
    size: instance.size as 'S' | 'M' | 'L',
  });
});
