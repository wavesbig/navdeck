'use client';

import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ArrowUpCircle, ExternalLink, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChangelogCategoryBlock } from '@/components/layout/ChangelogTimeline';
import { parseChangelog } from '@/lib/changelog';
import type { VersionUpdateInfo } from '@/types';

/** 关闭记忆的 localStorage key：值为已忽略的版本 tag，新 tag 会重新提醒 */
export const UPDATE_DISMISS_KEY = 'navdeck-update-dismissed-tag';

interface UpdateNotificationProps {
  update: VersionUpdateInfo;
  /** 用户关闭提醒：父级负责持久化并切换到工具栏常驻入口 */
  onDismiss: (tag: string) => void;
}

/**
 * 右下角更新提醒浮层
 *
 * - 毛玻璃浮层家族（surface/85 + blur + hairline + float 阴影），与工具栏同族
 * - 内容直接平铺：日志详情限高滚动 + Star 引导
 * - 展示与否由父级（FloatingToolbar）按关闭记忆决定，本组件纯展示
 */
export function UpdateNotification({
  update,
  onDismiss,
}: UpdateNotificationProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 日志详情：远端 Release 说明按分类分组（与关于弹窗同一解析链路）
  const release = parseChangelog(`## ${update.tag}\n\n${update.notes}`)[0];
  const categories = release?.categories ?? [];

  return (
    <VStack
      gap={3}
      className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-chrome w-80 max-w-[calc(100vw-2rem)] rounded-panel bg-surface/85 backdrop-blur-md border border-border shadow-float p-4 transition-all duration-300 ${
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      role="status"
    >
      <HStack justify="between" align="center" width="100%">
        <HStack gap={2} align="center" className="min-w-0">
          <ArrowUpCircle size={16} className="flex-none text-accent" />
          <Text size="sm" weight="semibold" className="text-primary min-w-0">
            新版本 {update.tag} 可用
          </Text>
        </HStack>
        <HStack gap={1} align="center">
          <IconButton
            label="查看发布页"
            icon={<ExternalLink size={14} />}
            variant="ghost"
            onClick={() => window.open(update.url, '_blank', 'noopener')}
          />
          <IconButton
            label="关闭提醒"
            icon={<X size={14} />}
            variant="ghost"
            onClick={() => onDismiss(update.tag)}
          />
        </HStack>
      </HStack>
      <VStack gap={2} className="max-h-[40dvh] overflow-y-auto px-1">
        {categories.map((category) => (
          <ChangelogCategoryBlock
            key={category.name}
            categoryName={category.name}
            items={category.items}
          />
        ))}
      </VStack>
      <HStack
        justify="between"
        align="center"
        width="100%"
        className="border-t border-border/60 pt-2"
      >
        <Text size="xsm" color="secondary">
          觉得 NavDeck 好用？
        </Text>
        <Button
          label="点亮 Star"
          icon={<Star size={14} className="text-warning" />}
          variant="ghost"
          size="sm"
          onClick={() =>
            window.open(
              'https://github.com/wavesbig/navdeck',
              '_blank',
              'noopener',
            )
          }
        />
      </HStack>
    </VStack>
  );
}
