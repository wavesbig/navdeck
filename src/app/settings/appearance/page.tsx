import { VStack } from '@astryxdesign/core/VStack';
import { ThemeForm } from '@/components/settings/ThemeForm';
import { WallpaperManager } from '@/components/settings/WallpaperManager';
import { normalizeFontSize } from '@/lib/font-size';
import { getUserPreference } from '@/lib/preferences';
import { getWallpaperPreferences, getWallpapers } from '@/lib/wallpaper';
import { FONT_SIZE_DEFAULT } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 外观设置页
 *
 * Linear / Vercel 风格：Card 容器 + label-above-input
 * - 外观 Card：RadioList 即时保存主题与字体大小
 * - 壁纸 Card：默认展开，本地选中态，底部「撤销 + 应用」统一保存
 */
export default async function AppearanceSettingsPage() {
  const [wallpapers, preferences, rawFontSize] = await Promise.all([
    getWallpapers(),
    getWallpaperPreferences(),
    getUserPreference<unknown>('fontSize', FONT_SIZE_DEFAULT),
  ]);

  return (
    <VStack gap={6} className="max-w-[640px]">
      <ThemeForm initialFontSize={normalizeFontSize(rawFontSize)} />
      <WallpaperManager wallpapers={wallpapers} preferences={preferences} />
    </VStack>
  );
}
