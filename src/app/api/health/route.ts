import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * 无鉴权健康检查（供容器 HEALTHCHECK / NAS 面板探测）
 *
 * - 200：应用可达且数据库连通
 * - 503：数据库查询失败（SQLite 文件不可写 / 损坏等）
 */
export async function GET() {
  try {
    await prisma.user.findFirst();
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
