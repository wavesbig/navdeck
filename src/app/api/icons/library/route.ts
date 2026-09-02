import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getIconUrl, loadManifest } from '@/lib/icons';

export const dynamic = 'force-dynamic';

/**
 * 图标库 API
 *
 * 返回：{ items: [{ name, label, url }] }
 */
export const GET = withAuth(async (_session, _req) => {
  const manifest = await loadManifest();
  const urlByName = new Map(
    manifest.icons.map((entry) => [
      entry.name,
      getIconUrl(manifest, entry.name),
    ]),
  );

  return NextResponse.json({
    items: manifest.icons
      .map(({ name, label }) => ({
        name,
        label,
        url: urlByName.get(name) ?? '',
      }))
      .sort(
        (a, b) =>
          a.label.localeCompare(b.label, 'zh-Hans-CN') ||
          a.name.localeCompare(b.name),
      ),
  });
});
