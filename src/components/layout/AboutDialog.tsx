'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { X } from 'lucide-react';
import { ChangelogTimeline } from '@/components/layout/ChangelogTimeline';

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 关于弹窗（头像菜单入口）
 *
 * 紧凑标题行 + 更新日志手风琴；当前版本与发布日期
 * 由手风琴首行（最新版本）直接展示，不再单独铺版。
 */
export function AboutDialog({ isOpen, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      aria-label="关于"
      purpose="info"
      width={400}
    >
      <VStack gap={3} className="p-5">
        <HStack justify="between" align="center">
          <Text size="base" weight="semibold" className="text-primary">
            关于
          </Text>
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
