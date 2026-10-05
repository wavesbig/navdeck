'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { X } from 'lucide-react';
import { CardStatusBadgeSetting } from '@/components/settings/CardStatusBadgeSetting';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ThemeForm } from '@/components/settings/ThemeForm';
import { ViewDisplaySetting } from '@/components/settings/ViewDisplaySetting';
import { WallpaperManager } from '@/components/settings/WallpaperManager';
import { DIALOG_WIDTH } from '@/lib/design-tokens';
import type {
  FontSizePreference,
  Wallpaper,
  WallpaperPreferences,
} from '@/types';

/** 外观快捷面板数据包（首页 SSR 取好后经工具栏透传） */
export interface AppearancePanelData {
  wallpapers: Wallpaper[];
  wallpaperPreferences: WallpaperPreferences;
  wallpaperScrim: number;
  fontSize: FontSizePreference;
  cardStatusBadge: boolean;
}

interface AppearanceQuickPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: AppearancePanelData;
  /** 卡片简洁模式（工具栏 SSR 初始值，传入「显示」分区） */
  cardSimpleMode: boolean;
}

/**
 * 外观快捷面板（头像菜单入口）
 *
 * 贴视口右侧的纵向面板，直接复用外观设置页同一套组件
 * （ThemeForm / CardStatusBadgeSetting / WallpaperManager），零复制：
 * 主题与字号即时保存，壁纸上传删除走 router.refresh()，行为与设置页一致。
 */
export function AppearanceQuickPanel({
  isOpen,
  onOpenChange,
  data,
  cardSimpleMode,
}: AppearanceQuickPanelProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      aria-label="外观快捷设置"
      purpose="info"
      width={DIALOG_WIDTH.md}
      padding={4}
      maxHeight="calc(100dvh - 32px)"
      position={{ end: 16, top: 16, bottom: 16 }}
    >
      <VStack gap={4}>
        <HStack justify="between" align="center">
          <Text size="base" weight="semibold" className="text-primary">
            外观
          </Text>
          <IconButton
            label="关闭"
            icon={<X size={16} />}
            variant="ghost"
            onClick={() => onOpenChange(false)}
          />
        </HStack>
        {/* 高度 = 对话框 maxHeight 偏移(32px) + 内边距/标题行/间距(约 5.5rem，随字号缩放) */}
        <div className="max-h-[calc(100dvh-32px-5.5rem)] overflow-y-auto">
          <VStack gap={4}>
            <ThemeForm title="主题与字体" initialFontSize={data.fontSize}>
              <CardStatusBadgeSetting initialEnabled={data.cardStatusBadge} />
            </ThemeForm>
            <SettingsSection
              title="显示"
              description="卡片与 Widget 横条的显示开关（与工具栏同步）"
            >
              <ViewDisplaySetting initialCardSimpleMode={cardSimpleMode} />
            </SettingsSection>
            <WallpaperManager
              wallpapers={data.wallpapers}
              preferences={data.wallpaperPreferences}
              initialScrim={data.wallpaperScrim}
            />
          </VStack>
        </div>
      </VStack>
    </Dialog>
  );
}
