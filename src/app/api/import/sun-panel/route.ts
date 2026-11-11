import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import {
  applySunPanelImport,
  parseSunPanelData,
  parseSunPanelFile,
  type SunPanelParseResult,
} from '@/lib/sun-panel';

export const dynamic = 'force-dynamic';

/**
 * Sun-Panel 数据导入 API
 *
 * - POST /api/import/sun-panel
 *   - multipart/form-data:
 *     - file: 上传的 .json / .sun-panel.json 或 .db 数据库文件
 *     - action: 'preview'（仅解析预览） | 'import'（执行导入，默认）
 *     - mode: 'append'（追加模式，默认） | 'overwrite'（覆盖模式）
 *   - application/json:
 *     - data: Sun-Panel JSON 原始内容或对象
 *     - action: 'preview' | 'import'
 *     - mode: 'append' | 'overwrite'
 */
export const POST = withAuth(async (_session, req) => {
  const contentType = req.headers.get('content-type') ?? '';

  let action: 'preview' | 'import' = 'import';
  let mode: 'append' | 'overwrite' = 'append';
  let parsed: SunPanelParseResult;

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: '请选择要上传的 Sun-Panel 配置文件或数据库' },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const actionParam = formData.get('action');
      if (actionParam === 'preview') action = 'preview';

      const modeParam = formData.get('mode');
      if (modeParam === 'overwrite') mode = 'overwrite';

      parsed = await parseSunPanelFile(buffer, file.name);
    } else {
      const body = await req.json();
      let rawContent: unknown = body;
      if (body && typeof body === 'object' && 'data' in body) {
        rawContent = body.data;
        if (body.action === 'preview') action = 'preview';
        if (body.mode === 'overwrite') mode = 'overwrite';
      }

      parsed = parseSunPanelData(rawContent);
    }

    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        preview: parsed,
      });
    }

    if (parsed.totalCards === 0) {
      return NextResponse.json(
        { error: '配置文件中未发现任何有效卡片（需至少包含内网或外网地址）' },
        { status: 400 },
      );
    }

    const stats = await applySunPanelImport(parsed, mode);
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '解析或导入 Sun-Panel 数据失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
