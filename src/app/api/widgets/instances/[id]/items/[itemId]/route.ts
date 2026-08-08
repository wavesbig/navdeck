import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { dateItemUpdateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * 实例日期项单条 API
 *
 * - PATCH: 更新 { name?, date?, recurring? }
 * - DELETE: 删除
 */
export const PATCH = withAuth(async (_session, req, ctx) => {
  const { id, itemId } = await ctx.params;

  const body = await req.json();
  const parsed = validateBody(dateItemUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { name, date, recurring } = parsed.data;

  // 确保 itemId 属于 instanceId
  const existing = await prisma.dateItem.findFirst({
    where: { id: itemId, instanceId: id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: '日期项不存在' }, { status: 404 });
  }

  const updated = await prisma.dateItem.update({
    where: { id: itemId },
    data: {
      ...(name !== undefined && { name }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(recurring !== undefined && { recurring }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    instanceId: updated.instanceId,
    widgetKey: updated.widgetKey,
    name: updated.name,
    date: updated.date.toISOString(),
    recurring: updated.recurring,
  });
});

export const DELETE = withAuth(async (_session, _req, ctx) => {
  const { id, itemId } = await ctx.params;

  // 确保 itemId 属于 instanceId
  const existing = await prisma.dateItem.findFirst({
    where: { id: itemId, instanceId: id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: '日期项不存在' }, { status: 404 });
  }

  await prisma.dateItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
});
