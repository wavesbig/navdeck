import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { cardCreateSchema } from '@/lib/validation';

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
  const parsed = validateBody(cardCreateSchema, body);
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
      // 外网地址留空回退内网地址，保证下游（状态探测/Auto 解析）永远拿到有效 URL
      externalUrl: data.externalUrl || data.internalUrl,
      icon: data.icon || '',
      description: data.description || null,
      categoryId: data.categoryId || null,
      order,
    },
    include: { category: true },
  });

  return NextResponse.json(card, { status: 201 });
});
