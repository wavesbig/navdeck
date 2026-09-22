import { NextResponse } from 'next/server';
import { fillMissingPositions } from '@/components/widgets/widget-grid-layout';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { widgetInstanceCreateSchema } from '@/lib/validation';
import type { WidgetKey, WidgetSize } from '@/types';

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

  // 自由布局坐标回填：缺坐标的实例按 order 扫描补位（一次性持久化）
  const fills = instances.some((i) => i.x === null || i.y === null)
    ? fillMissingPositions(
        instances.map((i) => ({
          id: i.id,
          size: i.size as WidgetSize,
          x: i.x,
          y: i.y,
        })),
      )
    : [];
  if (fills.length > 0) {
    await prisma.$transaction(
      fills.map((f) =>
        prisma.widgetInstance.update({
          where: { id: f.id },
          data: { x: f.x, y: f.y },
        }),
      ),
    );
  }

  return NextResponse.json({
    items: instances.map((i) => {
      const fill = fills.find((f) => f.id === i.id);
      return {
        id: i.id,
        widgetKey: i.widgetKey as WidgetKey,
        order: i.order,
        size: i.size as 'S' | 'M' | 'L',
        x: fill ? fill.x : i.x,
        y: fill ? fill.y : i.y,
      };
    }),
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
    x: instance.x,
    y: instance.y,
  });
});
