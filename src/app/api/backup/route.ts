import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { applyImport, applyZipImport, buildZip } from '@/lib/backup';
import { backupImportSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * 备份 API
 * - GET: 导出 zip（backup.json + data/uploads 上传文件）
 * - POST: 导入，支持 zip（multipart form-data 的 file 字段）
 *   或裸 JSON（body 直接为备份数据）
 */
export const GET = withAuth(async () => {
  const zip = await buildZip();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="navdeck-backup-${stamp}.zip"`,
    },
  });
});

export const POST = withAuth(async (_session, req) => {
  const contentType = req.headers.get('content-type') ?? '';

  // zip 导入（multipart form-data：file 字段）
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '缺少备份文件' }, { status: 400 });
    }
    try {
      await applyZipImport(Buffer.from(await file.arrayBuffer()));
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入失败';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  // 裸 JSON 导入（兼容）
  const body = await req.json();
  const parsed = validateBody(backupImportSchema, body);
  if (!parsed.ok) return parsed.response;
  await applyImport(parsed.data);
  return NextResponse.json({ success: true });
});
