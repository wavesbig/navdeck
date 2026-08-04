import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { syncLuckyCards } from '@/services/lucky';

/**
 * Lucky 同步 API
 * - POST: 手动触发一次同步
 *
 * 同步是全量 diff：Lucky 有的规则新建/更新卡片，
 * Lucky 删除的规则标记失效，用户删过的永久跳过。
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
