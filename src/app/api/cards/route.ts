import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';

/**
 * 卡片 API
 * - GET: 列表（按分类分组 + order 排序，含未分类）
 * - POST: 创建卡片
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const cards = await prisma.card.findMany({
    orderBy: [{categoryId: 'asc'}, {order: 'asc'}],
    include: {category: true},
  });

  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const body = await req.json();
  const {name, internalUrl, externalUrl, icon, description, categoryId} = body;

  // 校验必填字段
  if (!name?.trim()) {
    return NextResponse.json({error: '卡片名称必填'}, {status: 400});
  }
  if (!internalUrl?.trim()) {
    return NextResponse.json({error: '内网地址必填'}, {status: 400});
  }
  if (!externalUrl?.trim()) {
    return NextResponse.json({error: '外网地址必填'}, {status: 400});
  }
  if (!icon?.trim()) {
    return NextResponse.json({error: '图标必填'}, {status: 400});
  }

  // 校验分类存在（如果传了 categoryId）
  if (categoryId) {
    const category = await prisma.category.findUnique({where: {id: categoryId}});
    if (!category) {
      return NextResponse.json({error: '分类不存在'}, {status: 400});
    }
  }

  // 新卡片 order = 同分类下最大 order + 1
  const maxOrder = await prisma.card.aggregate({
    _max: {order: true},
    where: {categoryId: categoryId ?? null},
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const card = await prisma.card.create({
    data: {
      name: name.trim(),
      internalUrl: internalUrl.trim(),
      externalUrl: externalUrl.trim(),
      icon: icon.trim(),
      description: description?.trim() || null,
      categoryId: categoryId || null,
      order,
    },
    include: {category: true},
  });

  return NextResponse.json(card, {status: 201});
}
