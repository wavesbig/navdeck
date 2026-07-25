import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';
import type {DateItemInput} from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 日期项 CRUD（倒数日 / 正数日共用）
 *
 * - GET: 按 widgetKey 列出所有日期项
 *   - query: ?key=countdown | countup
 * - POST: 新增日期项
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (key !== 'countdown' && key !== 'countup') {
    return NextResponse.json({error: '无效的 widget key'}, {status: 400});
  }

  const items = await prisma.dateItem.findMany({
    where: {widgetKey: key},
    orderBy: {date: 'asc'},
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      widgetKey: item.widgetKey,
      name: item.name,
      date: item.date.toISOString(),
      recurring: item.recurring,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const body = (await req.json()) as DateItemInput & {
    widgetKey: 'countdown' | 'countup';
  };

  // 手动校验
  if (
    !body ||
    (body.widgetKey !== 'countdown' && body.widgetKey !== 'countup') ||
    typeof body.name !== 'string' ||
    body.name.trim().length === 0 ||
    body.name.length > 50 ||
    typeof body.date !== 'string' ||
    isNaN(Date.parse(body.date))
  ) {
    return NextResponse.json({error: '无效参数'}, {status: 400});
  }

  const item = await prisma.dateItem.create({
    data: {
      widgetKey: body.widgetKey,
      name: body.name.trim(),
      date: new Date(body.date),
      recurring: body.recurring ?? false,
    },
  });

  return NextResponse.json({
    id: item.id,
    widgetKey: item.widgetKey,
    name: item.name,
    date: item.date.toISOString(),
    recurring: item.recurring,
  });
}
