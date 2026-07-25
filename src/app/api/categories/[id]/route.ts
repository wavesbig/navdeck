import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';

/**
 * 单分类 API
 * - PATCH: 改名 / 图标 / 颜色
 * - DELETE: 删除分类（卡片 categoryId 置空，归到未分类）
 */
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
  const {name, icon, color} = body;

  const category = await prisma.category.update({
    where: {id},
    data: {
      ...(name !== undefined && {name: String(name).trim()}),
      ...(icon !== undefined && {icon: icon ? String(icon).trim() : null}),
      ...(color !== undefined && {color: color ? String(color).trim() : null}),
    },
  });

  return NextResponse.json(category);
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

  // 删除分类前，把该分类下卡片的 categoryId 置空（归到未分类）
  await prisma.card.updateMany({
    where: {categoryId: id},
    data: {categoryId: null},
  });

  await prisma.category.delete({where: {id}});

  return NextResponse.json({success: true});
}
