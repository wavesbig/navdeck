'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ExternalLink, X } from 'lucide-react';

interface CardPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 卡片名（标题 + iframe title） */
  name: string;
  /** 嵌入地址（由父组件根据网络模式解析） */
  href: string;
}

/**
 * 卡片弹框预览（iframe 嵌入）
 *
 * 点击 / 右键「弹框打开」时使用，不跳转新标签页直接查看操作目标站点。
 * 外部站点可能通过 X-Frame-Options / CSP frame-ancestors 拒绝嵌入，
 * 被拒时 iframe 空白，可用「新标签页打开」兜底。
 */
export function CardPreviewDialog({
  isOpen,
  onOpenChange,
  name,
  href,
}: CardPreviewDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      aria-label={`${name} 弹框预览`}
      purpose="info"
      width={960}
      padding={4}
    >
      <VStack gap={3}>
        <HStack justify="between" align="center">
          <HStack gap={2} align="center" className="min-w-0">
            <Text size="base" weight="semibold" className="text-primary">
              {name}
            </Text>
            <span title={href} className="min-w-0 truncate">
              <Text size="sm" color="secondary">
                {href}
              </Text>
            </span>
          </HStack>
          <HStack gap={1} align="center">
            <IconButton
              label="新标签页打开"
              icon={<ExternalLink size={16} />}
              variant="ghost"
              onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
            />
            <IconButton
              label="关闭"
              icon={<X size={16} />}
              variant="ghost"
              onClick={() => onOpenChange(false)}
            />
          </HStack>
        </HStack>
        <iframe
          src={href}
          title={name}
          className="h-[70dvh] w-full rounded-widget border border-border bg-surface"
        />
      </VStack>
    </Dialog>
  );
}
