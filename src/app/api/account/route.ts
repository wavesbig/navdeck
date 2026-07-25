import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * 账号 API
 *
 * - GET: 读取当前账号信息（仅用户名，不含密码）
 * - PATCH: 更新账号（用户名和/或密码）
 *   body: { username?: string, currentPassword?: string, newPassword?: string }
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({error: '账号不存在'}, {status: 404});
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const body = (await req.json()) as {
    username?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({error: '账号不存在'}, {status: 404});
  }

  // 修改用户名
  if (body.username && body.username !== user.username) {
    const newUsername = body.username.trim();
    if (!newUsername) {
      return NextResponse.json({error: '用户名不能为空'}, {status: 400});
    }
    const exists = await prisma.user.findUnique({where: {username: newUsername}});
    if (exists && exists.id !== user.id) {
      return NextResponse.json({error: '用户名已存在'}, {status: 409});
    }
    await prisma.user.update({
      where: {id: user.id},
      data: {username: newUsername},
    });
  }

  // 修改密码
  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({error: '当前密码必填'}, {status: 400});
    }
    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({error: '当前密码错误'}, {status: 400});
    }
    if (body.newPassword.length < 6) {
      return NextResponse.json({error: '新密码至少 6 位'}, {status: 400});
    }
    const newHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({
      where: {id: user.id},
      data: {passwordHash: newHash},
    });
  }

  return NextResponse.json({success: true});
}
