'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { X } from 'lucide-react';
import { ChangelogTimeline } from '@/components/layout/ChangelogTimeline';
import { APP_VERSION } from '@/lib/version';

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 关于弹窗（头像菜单入口）
 *
 * 紧凑标题行（关于 + 当前版本号）+ 完整更新日志。
 * Dialog 使用默认 spacing step 4 内边距，标题与列表左右对齐。
 * 数据来自 CHANGELOG.md 构建期解析结果。
 */
export function AboutDialog({ isOpen, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      aria-label="关于"
      purpose="info"
      width={420}
      padding={4}
    >
      <VStack gap={4}>
        <HStack justify="between" align="center">
          <HStack gap={2} align="center">
            <Text size="base" weight="semibold" className="text-primary">
              关于
            </Text>
            <span className="brand-title brand-title-sm">v{APP_VERSION}</span>
          </HStack>
          <IconButton
            label="关闭"
            icon={<X size={16} />}
            variant="ghost"
            onClick={() => onOpenChange(false)}
          />
        </HStack>
        <div className="max-h-[60dvh] overflow-y-auto">
          <ChangelogTimeline />
        </div>
      </VStack>
    </Dialog>
  );
}
