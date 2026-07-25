import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';
import type {DateItemInput} from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 单条日期项操作
 *
 * - PATCH: 更新日期项
 * - DELETE: 删除日期项
 */
export async function PATCH(
  req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const {id} = await params;
  const body = (await req.json()) as Partial<DateItemInput>;

  // 手动校验
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 50) {
      return NextResponse.json({error: '名称无效'}, {status: 400});
    }
  }
  if (body.date !== undefined) {
    if (typeof body.date !== 'string' || isNaN(Date.parse(body.date))) {
      return NextResponse.json({error: '日期无效'}, {status: 400});
    }
  }

  try {
    const item = await prisma.dateItem.update({
      where: {id},
      data: {
        ...(body.name !== undefined && {name: body.name.trim()}),
        ...(body.date !== undefined && {date: new Date(body.date)}),
        ...(body.recurring !== undefined && {recurring: body.recurring}),
      },
    });

    return NextResponse.json({
      id: item.id,
      widgetKey: item.widgetKey,
      name: item.name,
      date: item.date.toISOString(),
      recurring: item.recurring,
    });
  } catch {
    return NextResponse.json({error: '日期项不存在'}, {status: 404});
  }
}

export async function DELETE(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const {id} = await params;

  try {
    await prisma.dateItem.delete({where: {id}});
    return NextResponse.json({success: true});
  } catch {
    return NextResponse.json({error: '日期项不存在'}, {status: 404});
  }
}
