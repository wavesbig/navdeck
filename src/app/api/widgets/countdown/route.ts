import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { prisma } from '@/lib/db';
import { dateItemCreateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * 日期项 CRUD（倒数日 / 正数日共用）
 *
 * - GET: 按 widgetKey 列出所有日期项
 *   - query: ?key=countdown | countup
 * - POST: 新增日期项
 */
export const GET = withAuth(async (_session, req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (key !== 'countdown' && key !== 'countup') {
    return NextResponse.json({ error: '无效的 widget key' }, { status: 400 });
  }

  const items = await prisma.dateItem.findMany({
    where: { widgetKey: key },
    orderBy: { date: 'asc' },
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
});

export const POST = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(dateItemCreateSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const item = await prisma.dateItem.create({
    data: {
      widgetKey: data.widgetKey,
      name: data.name,
      date: new Date(data.date),
      recurring: data.recurring ?? false,
    },
  });

  return NextResponse.json({
    id: item.id,
    widgetKey: item.widgetKey,
    name: item.name,
    date: item.date.toISOString(),
    recurring: item.recurring,
  });
});
