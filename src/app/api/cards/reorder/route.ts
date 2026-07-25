import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';
import type {CardReorderItem} from '@/types';

/**
 * 卡片重排 API
 * - PATCH: 批量更新 order + categoryId（拖拽重排 + 跨分类拖拽）
 *
 * 请求体：{ items: CardReorderItem[] }
 * 响应：{ success: true }
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const body = await req.json();
  const {items} = body as { items: CardReorderItem[] };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({error: '无效的重排数据'}, {status: 400});
  }

  // 用事务批量更新
  await prisma.$transaction(
    items.map((item) =>
      prisma.card.update({
        where: {id: item.id},
        data: {
          order: item.order,
          categoryId: item.categoryId,
        },
      })
    )
  );

  return NextResponse.json({success: true});
}
