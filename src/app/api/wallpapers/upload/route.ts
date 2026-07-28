import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UPLOAD_ROOT = join(process.cwd(), 'data', 'uploads', 'wallpapers');

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB（壁纸比图标大）

/**
 * 壁纸上传 API
 *
 * POST /api/wallpapers/upload
 * Content-Type: multipart/form-data
 * body: { file: <File> }
 *
 * - 写入本地文件 data/uploads/wallpapers/xxx.jpg
 * - 写入 Wallpaper 表（source='upload'）
 * - 返回新建的 Wallpaper 记录
 *
 * 一张图适配两种主题（light/dark 共用），因此不再接收 theme 参数。
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: '未提供文件' }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `不支持的文件类型：${file.type}（仅支持 PNG/JPG/WebP）` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '文件过大，最大 10MB' }, { status: 400 });
  }

  // 确保目录存在
  if (!existsSync(UPLOAD_ROOT)) {
    await mkdir(UPLOAD_ROOT, { recursive: true });
  }

  // 生成唯一文件名
  const ext = extname(file.name) || mimeToExt(file.type);
  const filename = `${randomUUID()}${ext}`;
  const filepath = join(UPLOAD_ROOT, filename);

  // 写入文件
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // 写入数据库
  // 前端通过 /api/wallpapers/file?path=xxx.jpg 读取（与 icons/file 一致）
  const relativePath = `/api/wallpapers/file?path=${filename}`;
  const wallpaper = await prisma.wallpaper.create({
    data: {
      name: file.name.replace(ext, ''),
      source: 'upload',
      path: relativePath,
    },
  });

  return NextResponse.json(
    {
      id: wallpaper.id,
      name: wallpaper.name,
      source: wallpaper.source,
      path: wallpaper.path,
      thumbnail: wallpaper.thumbnail,
      createdAt: wallpaper.createdAt.toISOString(),
    },
    { status: 201 },
  );
}

/** MIME 类型到扩展名的兜底映射 */
function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
  };
  return map[mime] ?? '.png';
}
