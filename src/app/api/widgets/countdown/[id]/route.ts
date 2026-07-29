import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { prisma } from '@/lib/db';
import { dateItemUpdateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * 单条日期项操作
 *
 * - PATCH: 更新日期项
 * - DELETE: 删除日期项
 */
export const PATCH = withAuth(async (_session, req, ctx) => {
  const [{ id }, body] = await Promise.all([ctx.params, req.json()]);
  const parsed = validateBody(dateItemUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  try {
    const item = await prisma.dateItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.recurring !== undefined && { recurring: data.recurring }),
      },
    });

    return NextResponse.json({
      id: item.id,
      widgetKey: item.widgetKey,
      name: item.name,
      date: item.date.toISOString(),
      recurring: item.recurring,
    });
  } catch {
    return NextResponse.json({ error: '日期项不存在' }, { status: 404 });
  }
});

export const DELETE = withAuth(async (_session, _req, ctx) => {
  const { id } = await ctx.params;

  try {
    await prisma.dateItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '日期项不存在' }, { status: 404 });
  }
});
