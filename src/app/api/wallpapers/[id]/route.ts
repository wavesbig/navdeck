import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UPLOAD_ROOT = join(process.cwd(), 'data', 'uploads', 'wallpapers');

/**
 * 壁纸删除 API
 *
 * DELETE /api/wallpapers/[id]
 *
 * 删除数据库记录 + 本地文件（仅 upload 类型）
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;

  const wallpaper = await prisma.wallpaper.findUnique({ where: { id } });
  if (!wallpaper) {
    return NextResponse.json({ error: '壁纸不存在' }, { status: 404 });
  }

  // 如果是用户上传的，删除本地文件
  if (wallpaper.source === 'upload') {
    // path 格式：/api/wallpapers/file?path=xxx.jpg
    const url = new URL(wallpaper.path, 'http://localhost');
    const filename = url.searchParams.get('path');
    if (filename) {
      const filePath = join(UPLOAD_ROOT, basename(filename));
      if (existsSync(filePath)) {
        await rm(filePath);
      }
    }
  }

  await prisma.wallpaper.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
