import { VStack } from '@astryxdesign/core/VStack';
import { ThemeForm } from '@/components/settings/ThemeForm';
import { WallpaperManager } from '@/components/settings/WallpaperManager';
import { getWallpaperPreferences, getWallpapers } from '@/lib/wallpaper';

export const dynamic = 'force-dynamic';

/**
 * 外观设置页
 *
 * Linear / Vercel 风格：Card 容器 + label-above-input
 * - 主题 Card：RadioList 即时保存
 * - 壁纸 Card：默认展开，本地选中态，底部「撤销 + 应用」统一保存
 */
export default async function AppearanceSettingsPage() {
  const [wallpapers, preferences] = await Promise.all([
    getWallpapers(),
    getWallpaperPreferences(),
  ]);

  return (
    <VStack gap={6} className="max-w-[640px]">
      <ThemeForm />
      <WallpaperManager wallpapers={wallpapers} preferences={preferences} />
    </VStack>
  );
}
