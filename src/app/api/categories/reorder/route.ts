import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { prisma } from '@/lib/db';
import { categoryReorderSchema } from '@/lib/validation';

/**
 * 分类重排 API
 * - PATCH: 批量更新 order（拖拽重排）
 *
 * 请求体：{ items: CategoryReorderItem[] }
 * 响应：{ success: true }
 */
export const PATCH = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(categoryReorderSchema, body);
  if (!parsed.ok) return parsed.response;
  const { items } = parsed.data;

  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { order: item.order },
      }),
    ),
  );

  return NextResponse.json({ success: true });
});
