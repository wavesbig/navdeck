import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { dateItemUpdateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * 实例日期项单条 API
 *
 * - PATCH: 更新 { name?, date?, recurUnit? }（recurUnit 传 null 取消循环）
 * - DELETE: 删除；删除最后一个日期项时级联删除实例（日期卡片不允许没有日期）
 */
export const PATCH = withAuth(async (_session, req, ctx) => {
  const [{ id, itemId }, body] = await Promise.all([ctx.params, req.json()]);
  const parsed = validateBody(dateItemUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { name, date, recurUnit } = parsed.data;

  // 确保 itemId 属于 instanceId
  const existing = await prisma.dateItem.findFirst({
    where: { id: itemId, instanceId: id },
    select: { id: true, widgetKey: true },
  });
  if (!existing) {
    return NextResponse.json({ error: '日期项不存在' }, { status: 404 });
  }

  // 循环仅对倒数日生效，正数日不循环
  if (existing.widgetKey === 'countup' && recurUnit) {
    return NextResponse.json({ error: '正数日不支持循环' }, { status: 400 });
  }

  const updated = await prisma.dateItem.update({
    where: { id: itemId },
    data: {
      ...(name !== undefined && { name }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(recurUnit !== undefined && { recurUnit }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    instanceId: updated.instanceId,
    widgetKey: updated.widgetKey,
    name: updated.name,
    date: updated.date.toISOString(),
    recurUnit: updated.recurUnit,
    createdAt: updated.createdAt.toISOString(),
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

  // 事务内：删日期项后实例已空则级联删实例，保证「有卡片必有日期」
  await prisma.$transaction(async (tx) => {
    await tx.dateItem.delete({ where: { id: itemId } });
    const remaining = await tx.dateItem.count({ where: { instanceId: id } });
    if (remaining === 0) {
      await tx.widgetInstance.delete({ where: { id } });
    }
  });
  return NextResponse.json({ success: true });
});
