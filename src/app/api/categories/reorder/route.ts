import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';
import type {CategoryReorderItem} from '@/types';

/**
 * 分类重排 API
 * - PATCH: 批量更新 order（拖拽重排）
 *
 * 请求体：{ items: CategoryReorderItem[] }
 * 响应：{ success: true }
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const body = await req.json();
  const {items} = body as { items: CategoryReorderItem[] };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({error: '无效的重排数据'}, {status: 400});
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({
        where: {id: item.id},
        data: {order: item.order},
      })
    )
  );

  return NextResponse.json({success: true});
}
