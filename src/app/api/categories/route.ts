import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { prisma } from '@/lib/db';
import { categoryFormSchema } from '@/lib/validation';

/**
 * 分类 API
 * - GET: 列表（含卡片）
 * - POST: 创建分类
 */
export const GET = withAuth(async () => {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      cards: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return NextResponse.json(categories);
});

export const POST = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(categoryFormSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // 新分类 order = 当前最大 order + 1
  const maxOrder = await prisma.category.aggregate({
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const category = await prisma.category.create({
    data: {
      name: data.name,
      icon: data.icon || null,
      color: data.color || null,
      order,
    },
  });

  return NextResponse.json(category, { status: 201 });
});
