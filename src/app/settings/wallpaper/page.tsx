import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { WallpaperManager } from '@/components/settings/WallpaperManager';
import { getWallpaperPreferences, getWallpapers } from '@/lib/wallpaper';

export const dynamic = 'force-dynamic';

/**
 * 壁纸设置页
 *
 * 一张图适配两种主题（light/dark 共用，靠遮罩调整可读性）
 */
export default async function WallpaperSettingsPage() {
  const wallpapers = await getWallpapers();
  const preferences = await getWallpaperPreferences();

  return (
    <VStack gap={4}>
      <Heading level={4}>壁纸</Heading>
      <Text size="sm" color="secondary">
        一张图自动适配亮色和暗色主题
      </Text>
      <WallpaperManager wallpapers={wallpapers} preferences={preferences} />
    </VStack>
  );
}
