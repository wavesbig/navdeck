import { prisma } from '@/lib/db';
import { getUserPreference } from '@/lib/preferences';
import type { Wallpaper, WallpaperPreferences } from '@/types';

// 注意：findWallpaper 已迁移至 wallpaper-utils.ts（客户端安全，纯函数）
// 本文件含 prisma import，仅服务端使用

/**
 * 壁纸读取工具
 *
 * 服务端取数 + 客户端类型安全消费。
 * 偏好通过 UserPreference 存储（单个 wallpaper 字段，light/dark 共用）。
 */

/**
 * 取所有壁纸（按 createdAt 升序，预设在前、上传在后）
 */
export async function getWallpapers(): Promise<Wallpaper[]> {
  const rows = await prisma.wallpaper.findMany({
    orderBy: [{ source: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    source: w.source as Wallpaper['source'],
    path: w.path,
    thumbnail: w.thumbnail,
    createdAt: w.createdAt.toISOString(),
  }));
}

/**
 * 取壁纸偏好（单个 wallpaperId，light/dark 共用）
 *
 * 未设置时返回 null（表示不使用壁纸，回退到主题默认背景色）。
 */
export async function getWallpaperPreferences(): Promise<WallpaperPreferences> {
  const wallpaper = await getUserPreference<string | null>('wallpaper', null);
  return { wallpaper };
}
