import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { prisma } from '@/lib/db';
import { cardFormSchema } from '@/lib/validation';

/**
 * 卡片 API
 * - GET: 列表（按分类分组 + order 排序，含未分类）
 * - POST: 创建卡片
 */
export const GET = withAuth(async () => {
  const cards = await prisma.card.findMany({
    orderBy: [{ categoryId: 'asc' }, { order: 'asc' }],
    include: { category: true },
  });

  return NextResponse.json(cards);
});

export const POST = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(cardFormSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // 校验分类存在（如果传了非空 categoryId）
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      return NextResponse.json(
        {
          error: '分类不存在',
          fieldErrors: { categoryId: ['分类不存在'] },
        },
        { status: 400 },
      );
    }
  }

  // 新卡片 order = 同分类下最大 order + 1
  const maxOrder = await prisma.card.aggregate({
    _max: { order: true },
    where: { categoryId: data.categoryId ?? null },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const card = await prisma.card.create({
    data: {
      name: data.name,
      internalUrl: data.internalUrl,
      externalUrl: data.externalUrl,
      icon: data.icon,
      description: data.description || null,
      categoryId: data.categoryId || null,
      order,
    },
    include: { category: true },
  });

  return NextResponse.json(card, { status: 201 });
});
