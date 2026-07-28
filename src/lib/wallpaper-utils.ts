import type { Wallpaper } from '@/types';

/**
 * 根据 wallpaperId 从列表中查找壁纸（O(n) 线性查找，列表量小可接受）
 *
 * 纯函数，无副作用，可在客户端安全使用。
 * 服务端取数逻辑在 wallpaper.ts（含 prisma import，仅服务端使用）。
 */
export function findWallpaper(
  wallpapers: Wallpaper[],
  id: string | null,
): Wallpaper | null {
  if (!id) return null;
  return wallpapers.find((w) => w.id === id) ?? null;
}
