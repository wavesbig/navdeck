'use client';

import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ChangelogTimeline } from '@/components/layout/ChangelogTimeline';
import changelog from '@/lib/changelog.generated.json';
import { APP_VERSION } from '@/lib/version';

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 关于弹窗（右上角工具栏入口）
 *
 * 当前版本（package.json 单一来源）+ 完整更新日志
 * （CHANGELOG.md 构建期解析），与首页更新内容弹窗、
 * GitHub Release 说明共用同一事实源。
 */
export function AboutDialog({ isOpen, onOpenChange }: AboutDialogProps) {
  const currentVersion = `v${APP_VERSION}`;
  const current = changelog.releases.find((r) => r.version === currentVersion);

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={460}
    >
      <Layout
        header={
          <DialogHeader title="关于 NavDeck" onOpenChange={onOpenChange} />
        }
        content={
          <LayoutContent>
            <VStack gap={5}>
              <HStack gap={3} align="center">
                <span className="brand-title">{currentVersion}</span>
                {current?.date && (
                  <Text size="xsm" color="secondary">
                    发布于 {current.date}
                  </Text>
                )}
              </HStack>
              <VStack gap={4} className="max-h-96 overflow-y-auto">
                <ChangelogTimeline />
              </VStack>
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
