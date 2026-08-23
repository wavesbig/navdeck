import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import {
  deleteMissingLuckyCards,
  getMissingLuckyCards,
} from '@/services/lucky';

/**
 * Lucky 失效卡片 API
 * - GET: 查询已标记失效的卡片
 * - DELETE: 手动一键删除失效卡片
 */
export const GET = withAuth(async () => {
  try {
    const cards = await getMissingLuckyCards();
    return NextResponse.json({ cards });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失效卡片失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = withAuth(async () => {
  try {
    const deleted = await deleteMissingLuckyCards();
    return NextResponse.json({ deleted });
  } catch (e) {
    const message = e instanceof Error ? e.message : '删除失效卡片失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
