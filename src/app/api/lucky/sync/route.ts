import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { syncLuckyCards } from '@/services/lucky';

/**
 * Lucky 同步 API
 * - POST: 手动触发一次同步
 *
 * 同步是全量 diff：Lucky 有的规则新建/更新卡片，
 * Lucky 删除或禁用的规则仅标记失效，用户可在设置页手动清理。
 */
export const POST = withAuth(async () => {
  try {
    const result = await syncLuckyCards();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : '同步失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
