import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { prisma } from '@/lib/db';
import { cardReorderSchema } from '@/lib/validation';

/**
 * 卡片重排 API
 * - PATCH: 批量更新 order + categoryId（拖拽重排 + 跨分类拖拽）
 *
 * 请求体：{ items: CardReorderItem[] }
 * 响应：{ success: true }
 */
export const PATCH = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(cardReorderSchema, body);
  if (!parsed.ok) return parsed.response;
  const { items } = parsed.data;

  // 用事务批量更新
  await prisma.$transaction(
    items.map((item) =>
      prisma.card.update({
        where: { id: item.id },
        data: {
          order: item.order,
          categoryId: item.categoryId,
        },
      }),
    ),
  );

  return NextResponse.json({ success: true });
});
