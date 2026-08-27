import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { VStack } from '@astryxdesign/core/VStack';
import {
  AssetsManager,
  type UploadedIcon,
} from '@/components/settings/AssetsManager';
import { prisma } from '@/lib/db';
import { getWallpaperPreferences, getWallpapers } from '@/lib/wallpaper';

export const dynamic = 'force-dynamic';

/** 内置图标的两个上传子目录 */
const SCOPES = ['cards', 'library'] as const;

/**
 * 素材管理页（文件维护中心）
 *
 * 所有上传文件的统一查看/上传/清理入口：
 * 图标与壁纸图片双区块平铺，各区块头部带上传统钮。
 * 壁纸的「使用」（选择/预览/应用）在外观设置中。
 */
export default async function AssetsPage() {
  const iconsRoot = join(process.cwd(), 'data', 'uploads', 'icons');
  // 图标目录与壁纸数据相互独立，并行读取
  const [icons, allWallpapers, wallpaperPrefs, cardIcons] = await Promise.all([
    // 卡片图标引用（用于删除前的使用提示）
    Promise.all(
      SCOPES.map(async (scope): Promise<UploadedIcon[]> => {
        const dir = join(iconsRoot, scope);
        if (!existsSync(dir)) return [];
        const files = await readdir(dir);
        return Promise.all(
          files.map(async (file): Promise<UploadedIcon> => {
            const filePath = join(dir, file);
            try {
              const s = await stat(filePath);
              return {
                path: `${scope}/${file}`,
                name: file,
                scope,
                size: s.size,
                mtime: s.mtime.toISOString(),
              };
            } catch {
              return { path: `${scope}/${file}`, name: file, scope };
            }
          }),
        );
      }),
    ).then((lists) => lists.flat()),
    getWallpapers(),
    getWallpaperPreferences(),
    // 卡片图标引用（用于删除前的使用提示）
    prisma.card.findMany({ select: { icon: true } }),
  ]);

  // 统计每个上传图标文件被多少张卡片引用（path → 卡片数）
  const iconUsage: Record<string, number> = {};
  for (const { icon } of cardIcons) {
    const path = icon?.split('path=')[1];
    if (path) {
      iconUsage[path] = (iconUsage[path] ?? 0) + 1;
    }
  }
  const uploadedWallpapers = allWallpapers.filter((w) => w.source === 'upload');

  return (
    <VStack gap={6}>
      <AssetsManager
        icons={icons}
        wallpapers={uploadedWallpapers}
        appliedWallpaperId={wallpaperPrefs.wallpaper}
        iconUsage={iconUsage}
      />
    </VStack>
  );
}
