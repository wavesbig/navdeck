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
 * 使用 Dialog 默认内边距（spacing step 4）；当前版本号
 * （package.json 单一来源）在标题行展示，更新日志为手风琴。
 */
export function AboutDialog({ isOpen, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      aria-label="关于"
      purpose="info"
      width={400}
      padding={4}
    >
      <VStack gap={3}>
        <HStack justify="between" align="center">
          <HStack gap={2} align="center">
            <Text size="base" weight="semibold" className="text-primary">
              关于
            </Text>
            <span className="brand-title">v{APP_VERSION}</span>
          </HStack>
          <IconButton
            label="关闭"
            icon={<X size={16} />}
            variant="ghost"
            onClick={() => onOpenChange(false)}
          />
        </HStack>
        <ChangelogTimeline />
      </VStack>
    </Dialog>
  );
}
