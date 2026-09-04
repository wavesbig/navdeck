import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { searchEngineReorderSchema } from '@/lib/validation';

/**
 * 搜索引擎重排 API
 * - PATCH: 批量更新 order（拖拽排序）
 *
 * 请求体：{ items: { id, order }[] }
 */
export const PATCH = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(searchEngineReorderSchema, body);
  if (!parsed.ok) return parsed.response;
  const { items } = parsed.data;

  await prisma.$transaction(
    items.map((item) =>
      prisma.searchEngine.update({
        where: { id: item.id },
        data: { order: item.order },
      }),
    ),
  );

  return NextResponse.json({ success: true });
});
