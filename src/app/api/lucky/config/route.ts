import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getLuckyConfig } from '@/services/lucky';

/**
 * Lucky 配置 API
 * - GET: 读取 Lucky 配置（未配置时返回默认值）
 *
 * 写入复用 /api/preferences（PATCH { key: 'lucky', value: LuckyConfig }），
 * 避免重复实现 upsert 逻辑。
 */
export const GET = withAuth(async () => {
  const config = await getLuckyConfig();
  return NextResponse.json(config);
});
