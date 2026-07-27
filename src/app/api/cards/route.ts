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

  // 字段级校验（与前端 zod schema 对齐，作为兜底）
  const fieldErrors: Record<string, string> = {};
  if (!name?.trim()) {
    fieldErrors.name = '名称必填';
  } else if (name.trim().length > 50) {
    fieldErrors.name = '名称最多 50 个字符';
  }
  if (!internalUrl?.trim()) {
    fieldErrors.internalUrl = '内网地址必填';
  } else if (!isValidUrl(internalUrl)) {
    fieldErrors.internalUrl = '请输入合法的 http/https 地址';
  }
  if (!externalUrl?.trim()) {
    fieldErrors.externalUrl = '外网地址必填';
  } else if (!isValidUrl(externalUrl)) {
    fieldErrors.externalUrl = '请输入合法的 http/https 地址';
  }
  if (!icon?.trim()) {
    fieldErrors.icon = '请选择图标';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {error: '表单校验失败', fieldErrors},
      {status: 400}
    );
  }

  // 校验分类存在（如果传了 categoryId）
  if (categoryId) {
    const category = await prisma.category.findUnique({where: {id: categoryId}});
    if (!category) {
      return NextResponse.json(
        {error: '分类不存在', fieldErrors: {categoryId: '分类不存在'}},
        {status: 400}
      );
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

/** URL 合法性校验（http/https 协议） */
function isValidUrl(val: string): boolean {
  try {
    const u = new URL(val);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
