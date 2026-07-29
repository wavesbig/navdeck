import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { prisma } from '@/lib/db';
import { categoryUpdateSchema } from '@/lib/validation';

/**
 * 单分类 API
 * - PATCH: 改名 / 图标 / 颜色
 * - DELETE: 删除分类（卡片 categoryId 置空，归到未分类）
 */
export const PATCH = withAuth(async (_session, req, ctx) => {
  const [{ id }, body] = await Promise.all([ctx.params, req.json()]);
  const parsed = validateBody(categoryUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.icon !== undefined && { icon: data.icon || null }),
      ...(data.color !== undefined && { color: data.color || null }),
    },
  });

  return NextResponse.json(category);
});

export const DELETE = withAuth(async (_session, _req, ctx) => {
  const { id } = await ctx.params;

  // 删除分类前，把该分类下卡片的 categoryId 置空（归到未分类）
  await prisma.card.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
