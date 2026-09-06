'use client';

import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { ListChecks, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface BatchDeleteBarProps {
  selectedCount: number;
  totalCount: number;
  deleting: boolean;
  onToggleAll: () => void;
  onConfirmDelete: () => Promise<void>;
  onCancel: () => void;
}

/**
 * 批量删除底部操作条 + 确认弹框
 *
 * 与 EditModeBanner 同族浮层（surface + blur + hairline），但可交互。
 * 确认弹框状态由本组件自持，删除进行中禁止关闭。
 */
export function BatchDeleteBar({
  selectedCount,
  totalCount,
  deleting,
  onToggleAll,
  onConfirmDelete,
  onCancel,
}: BatchDeleteBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <HStack
        justify="center"
        className="fixed inset-x-0 bottom-5 z-50 edit-banner-enter"
      >
        <HStack
          align="center"
          gap={2}
          paddingInline={4}
          paddingBlock={2}
          className="rounded-widget bg-surface/85 text-primary border border-border shadow-lg backdrop-blur-md"
        >
          <ListChecks size={16} aria-hidden="true" />
          <Text type="label">
            已选 {selectedCount} / {totalCount} 张卡片
          </Text>
          <Button
            label={selectedCount === totalCount ? '取消全选' : '全选'}
            variant="ghost"
            size="sm"
            isDisabled={totalCount === 0}
            onClick={onToggleAll}
          />
          <Button
            label={`删除${selectedCount > 0 ? `（${selectedCount}）` : ''}`}
            variant="destructive"
            size="sm"
            icon={<Trash2 size={14} />}
            isDisabled={selectedCount === 0}
            isLoading={deleting}
            onClick={() => setConfirmOpen(true)}
          />
          <Button label="取消" variant="ghost" size="sm" onClick={onCancel} />
        </HStack>
      </HStack>

      <AlertDialog
        isOpen={confirmOpen}
        onOpenChange={(o) => {
          if (!o && !deleting) setConfirmOpen(false);
        }}
        title="批量删除卡片"
        description={`确定删除选中的 ${selectedCount} 张卡片吗？该操作不可撤销。`}
        actionLabel={`删除 ${selectedCount} 张`}
        cancelLabel="取消"
        isActionLoading={deleting}
        onAction={() => void onConfirmDelete()}
      />
    </>
  );
}
