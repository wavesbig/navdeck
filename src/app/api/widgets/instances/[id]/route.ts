import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { widgetInstanceUpdateSchema } from '@/lib/validation';
import type { WidgetKey } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Widget 实例单条 API
 *
 * - PATCH: 更新 { size?, order? }
 * - DELETE: 删除实例（关联的 DateItem 级联删除）
 */
export const PATCH = withAuth(async (_session, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = validateBody(widgetInstanceUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { size, order } = parsed.data;

  const updated = await prisma.widgetInstance.update({
    where: { id },
    data: {
      ...(size !== undefined && { size }),
      ...(order !== undefined && { order }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    widgetKey: updated.widgetKey as WidgetKey,
    order: updated.order,
    size: updated.size as 'S' | 'M' | 'L',
  });
});

export const DELETE = withAuth(async (_session, _req, ctx) => {
  const { id } = await ctx.params;
  // DateItem 通过 onDelete: Cascade 自动级联删除
  await prisma.widgetInstance.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
