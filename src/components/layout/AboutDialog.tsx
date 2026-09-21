'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ArrowUpCircle, X } from 'lucide-react';
import { ChangelogTimeline } from '@/components/layout/ChangelogTimeline';
import { parseChangelog } from '@/lib/changelog';
import { DIALOG_WIDTH } from '@/lib/design-tokens';
import { APP_VERSION } from '@/lib/version';
import type { VersionUpdateInfo } from '@/types';

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 远端最新 Release（有新版本时由工具栏传入） */
  update?: VersionUpdateInfo | null;
}

/**
 * 关于弹窗（头像菜单入口）
 *
 * 紧凑标题行（关于 + 当前版本号）+ 完整更新日志。
 * Dialog 使用默认 spacing step 4 内边距，标题与列表左右对齐。
 * 数据来自 CHANGELOG.md 构建期解析结果。
 */
export function AboutDialog({
  isOpen,
  onOpenChange,
  update = null,
}: AboutDialogProps) {
  const updateReleases = update
    ? parseChangelog(`## ${update.tag}\n\n${update.notes}`)
    : [];

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      aria-label="关于"
      purpose="info"
      width={DIALOG_WIDTH.lg}
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
        <div className="max-h-[70dvh] overflow-y-auto">
          {update && (
            <VStack
              gap={2}
              className="mb-3 rounded-panel border border-accent/30 bg-accent/10 p-3"
            >
              <HStack justify="between" align="center" width="100%">
                <HStack gap={2} align="center">
                  <ArrowUpCircle size={16} className="flex-none text-accent" />
                  <Text size="sm" weight="semibold" className="text-primary">
                    新版本 {update.tag} 可用
                  </Text>
                </HStack>
                <a
                  href={update.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  查看发布页
                </a>
              </HStack>
              <ChangelogTimeline
                releases={updateReleases}
                defaultExpandedVersion={update.tag}
              />
            </VStack>
          )}
          <ChangelogTimeline />
        </div>
      </VStack>
    </Dialog>
  );
}
