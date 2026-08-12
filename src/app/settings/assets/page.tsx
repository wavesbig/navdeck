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
 * Linear / Vercel 风格：Card 容器
 * - 顶部操作行：SegmentedControl + 上传按钮
 * - 下方 Grid：tile hover 显示底部工具条（名称 + 删除按钮）
 */
export default async function AssetsPage() {
  const iconsRoot = join(process.cwd(), 'data', 'uploads', 'icons');
  // 两个目录相互独立，并行读取
  const icons = (
    await Promise.all(
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
    )
  ).flat();

  const allWallpapers = await getWallpapers();
  const uploadedWallpapers = allWallpapers.filter((w) => w.source === 'upload');

  return (
    <VStack gap={4} className="max-w-[640px]">
      <AssetsManager icons={icons} wallpapers={uploadedWallpapers} />
    </VStack>
  );
}
