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

/**
 * 素材管理页
 *
 * Linear / Vercel 风格：Card 容器
 * - 顶部操作行：SegmentedControl + 上传按钮
 * - 下方 Grid：tile hover 显示底部工具条（名称 + 删除按钮）
 */
export default async function AssetsPage() {
  const iconsRoot = join(process.cwd(), 'data', 'uploads', 'icons');
  const scopes = ['cards', 'library'] as const;
  const icons: UploadedIcon[] = [];

  for (const scope of scopes) {
    const dir = join(iconsRoot, scope);
    if (existsSync(dir)) {
      const files = await readdir(dir);
      for (const file of files) {
        icons.push({
          path: `${scope}/${file}`,
          name: file,
          scope,
        });
      }
    }
  }

  const allWallpapers = await getWallpapers();
  const uploadedWallpapers = allWallpapers.filter((w) => w.source === 'upload');

  return (
    <VStack gap={4} className="max-w-[640px]">
      <AssetsManager icons={icons} wallpapers={uploadedWallpapers} />
    </VStack>
  );
}
