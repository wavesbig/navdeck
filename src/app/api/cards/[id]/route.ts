import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';

/**
 * 单卡片 API
 * - GET: 详情
 * - PATCH: 更新
 * - DELETE: 删除
 */
export async function GET(
  _req: Request,
  {params}: { params: Promise<{id: string}> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const {id} = await params;
  const card = await prisma.card.findUnique({
    where: {id},
    include: {category: true},
  });

  if (!card) {
    return NextResponse.json({error: '卡片不存在'}, {status: 404});
  }

  return NextResponse.json(card);
}

export async function PATCH(
  req: Request,
  {params}: { params: Promise<{id: string}> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const {id} = await params;
  const body = await req.json();
  const {name, internalUrl, externalUrl, icon, description, categoryId} = body;

  // 校验分类存在（如果传了 categoryId）
  if (categoryId) {
    const category = await prisma.category.findUnique({where: {id: categoryId}});
    if (!category) {
      return NextResponse.json({error: '分类不存在'}, {status: 400});
    }
  }

  const card = await prisma.card.update({
    where: {id},
    data: {
      ...(name !== undefined && {name: String(name).trim()}),
      ...(internalUrl !== undefined && {internalUrl: String(internalUrl).trim()}),
      ...(externalUrl !== undefined && {externalUrl: String(externalUrl).trim()}),
      ...(icon !== undefined && {icon: String(icon).trim()}),
      ...(description !== undefined && {
        description: description ? String(description).trim() : null,
      }),
      ...(categoryId !== undefined && {categoryId: categoryId || null}),
    },
    include: {category: true},
  });

  return NextResponse.json(card);
}

export async function DELETE(
  _req: Request,
  {params}: { params: Promise<{id: string}> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const {id} = await params;
  await prisma.card.delete({where: {id}});

  return NextResponse.json({success: true});
}
