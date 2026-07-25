import {NextResponse} from 'next/server';
import {auth} from '@/lib/auth';
import {loadManifest, searchIcons, getIconUrl} from '@/lib/icons';

export const dynamic = 'force-dynamic';

/**
 * 图标库 API
 *
 * GET /api/icons/library?q=jelly&limit=50
 *   - q: 搜索关键词（可选，空返回全部）
 *   - limit: 最大返回数量（默认 50）
 *
 * 返回：{ items: [{ name, label, category, url }] }
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const {searchParams} = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1),
    200
  );

  const manifest = await loadManifest();
  const entries = await searchIcons(q, limit);

  return NextResponse.json({
    items: entries.map((entry) => ({
      ...entry,
      url: getIconUrl(manifest, entry.name),
    })),
  });
}
