import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { VStack } from '@astryxdesign/core/VStack';
import {
  AssetsManager,
  type UploadedIcon,
} from '@/components/settings/AssetsManager';
import { getWallpapers } from '@/lib/wallpaper';

export const dynamic = 'force-dynamic';

/** 内置图标的两个上传子目录 */
const SCOPES = ['cards', 'library'] as const;

/**
 * 素材管理页
 *
 * 平铺双区块（图标 / 壁纸图片），各区块头部带上传统钮。
 */
export default async function AssetsPage() {
  const iconsRoot = join(process.cwd(), 'data', 'uploads', 'icons');
  // 图标目录与壁纸数据相互独立，并行读取
  const [icons, allWallpapers] = await Promise.all([
    Promise.all(
      SCOPES.map(async (scope): Promise<UploadedIcon[]> => {
        const dir = join(iconsRoot, scope);
        if (!existsSync(dir)) return [];
        const files = await readdir(dir);
        return files.map((file) => ({
          path: `${scope}/${file}`,
          name: file,
          scope,
        }));
      }),
    ).then((lists) => lists.flat()),
    getWallpapers(),
  ]);
  const uploadedWallpapers = allWallpapers.filter((w) => w.source === 'upload');

  return (
    <VStack gap={6}>
      <AssetsManager icons={icons} wallpapers={uploadedWallpapers} />
    </VStack>
  );
}
