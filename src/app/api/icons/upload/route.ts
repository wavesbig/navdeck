import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UPLOAD_ROOT = join(process.cwd(), 'data', 'uploads', 'icons');

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 图标上传 API
 *
 * POST /api/icons/upload
 * Content-Type: multipart/form-data
 * body: { file: <File>, scope?: 'cards' | 'library' }
 *
 * 返回：{ path } - 可直接用于 <img src> 的相对路径
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const scope = (formData.get('scope') as string) || 'cards';

  if (scope !== 'cards' && scope !== 'library') {
    return NextResponse.json({ error: '无效的 scope' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: '未提供文件' }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `不支持的文件类型：${file.type}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '文件过大，最大 5MB' }, { status: 400 });
  }

  // 确保目录存在
  const targetDir = join(UPLOAD_ROOT, scope);
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }

  // 生成唯一文件名：保留原扩展名
  const ext = extname(file.name) || mimeToExt(file.type);
  const filename = `${randomUUID()}${ext}`;
  const filepath = join(targetDir, filename);

  // 写入文件
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // 返回相对路径（前端可通过 /api/icons/file?path=... 读取）
  const relativePath = `/api/icons/file?path=${scope}/${filename}`;

  return NextResponse.json({ path: relativePath }, { status: 201 });
}

/** MIME 类型到扩展名的兜底映射 */
function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico',
  };
  return map[mime] ?? '.png';
}
