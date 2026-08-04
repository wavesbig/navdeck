import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { searchCards } from '@/lib/search';
import type { CardLuckyState } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 搜索 API
 *
 * GET /api/search?q=xxx
 * - 服务端拉取所有卡片（含分类），调用 searchCards 匹配
 * - 返回 SearchResult[]（已序列化日期）
 */
export const GET = withAuth(async (_session, req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const cards = await prisma.card.findMany({
    orderBy: { order: 'asc' },
    include: { category: true },
  });

  // 序列化日期 + lucky 字段类型断言（Prisma JsonValue → CardLuckyState）
  const serialized = cards.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    lucky: c.lucky as CardLuckyState | null,
    category: c.category
      ? {
          ...c.category,
          // Category 表无 createdAt/updatedAt
        }
      : null,
  }));

  const results = searchCards(serialized, q);
  // 仅返回必要字段
  return NextResponse.json({
    items: results.slice(0, 20).map((r) => ({
      card: r.card,
      matches: r.matches,
      score: r.score,
    })),
  });
});
