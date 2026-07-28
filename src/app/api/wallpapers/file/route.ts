import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UPLOAD_ROOT = join(process.cwd(), 'data', 'uploads', 'wallpapers');

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/**
 * 壁纸文件读取 API
 *
 * GET /api/wallpapers/file?path=xxx.jpg
 *
 * 从 data/uploads/wallpapers/{filename} 读取并返回图片
 * 防止路径穿越攻击
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('path');

  if (!filename) {
    return NextResponse.json({ error: '缺少 path 参数' }, { status: 400 });
  }

  // 安全检查：只允许单文件名（不含路径分隔符）
  const normalized = normalize(filename).replace(/\\/g, '/');
  if (normalized.includes('/') || normalized.includes('..')) {
    return NextResponse.json({ error: '无效的路径' }, { status: 400 });
  }

  // 防止路径穿越：再次校验绝对路径在 UPLOAD_ROOT 之下
  const fullPath = join(UPLOAD_ROOT, normalized);
  const normalizedFull = normalize(fullPath);
  if (!normalizedFull.startsWith(normalize(UPLOAD_ROOT) + sep)) {
    return NextResponse.json({ error: '无效的路径' }, { status: 400 });
  }

  if (!existsSync(normalizedFull)) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  const buffer = await readFile(normalizedFull);
  const ext = `.${normalized.split('.').pop()?.toLowerCase()}`;
  const mime = MIME_MAP[ext] ?? 'application/octet-stream';

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
