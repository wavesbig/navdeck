import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { withAuth, validateBody } from '@/lib/api';
import { prisma } from '@/lib/db';
import { accountUpdateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * 账号 API
 *
 * - GET: 读取当前账号信息（仅用户名，不含密码）
 * - PATCH: 更新账号（用户名和/或密码）
 *   body: { username?: string, currentPassword?: string, newPassword?: string }
 */
export const GET = withAuth(async () => {
  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: '账号不存在' }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
  });
});

export const PATCH = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(accountUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: '账号不存在' }, { status: 404 });
  }

  // 修改用户名
  if (data.username && data.username !== user.username) {
    const exists = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (exists && exists.id !== user.id) {
      return NextResponse.json(
        {
          error: '用户名已存在',
          fieldErrors: { username: ['用户名已存在'] },
        },
        { status: 409 },
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { username: data.username },
    });
  }

  // 修改密码
  if (data.newPassword) {
    // superRefine 已保证 newPassword 存在时 currentPassword 必填
    const ok = await bcrypt.compare(data.currentPassword ?? '', user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        {
          error: '当前密码错误',
          fieldErrors: { currentPassword: ['当前密码错误'] },
        },
        { status: 400 },
      );
    }
    const newHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });
  }

  return NextResponse.json({ success: true });
});
