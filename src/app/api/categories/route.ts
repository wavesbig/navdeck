import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * 分类 API
 * - GET: 列表（含卡片）
 * - POST: 创建分类
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      cards: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await req.json();
  const { name, icon, color } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '分类名称必填' }, { status: 400 });
  }

  // 新分类 order = 当前最大 order + 1
  const maxOrder = await prisma.category.aggregate({
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      icon: icon?.trim() || null,
      color: color?.trim() || null,
      order,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
