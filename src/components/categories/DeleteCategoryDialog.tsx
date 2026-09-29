'use client';

import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { DIALOG_WIDTH } from '@/lib/design-tokens';

interface DeleteCategoryDialogProps {
  /** 是否有待删除分类（控制弹窗开关） */
  pending: boolean;
  /** 删除请求进行中（禁用取消与关闭） */
  deleting: boolean;
  /** 确认弹窗描述文案 */
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 删除分类确认弹窗（主页编辑模式与设置页共用）
 *
 * 状态与动作来自配套的 useCategoryDelete hook。
 */
export function DeleteCategoryDialog({
  pending,
  deleting,
  description,
  onCancel,
  onConfirm,
}: DeleteCategoryDialogProps) {
  return (
    <AlertDialog
      isOpen={pending}
      onOpenChange={(open) => {
        if (!open && !deleting) onCancel();
      }}
      title="删除分类"
      description={description}
      cancelLabel="取消"
      actionLabel="删除"
      isActionLoading={deleting}
      onAction={() => void onConfirm()}
      width={DIALOG_WIDTH.md}
    />
  );
}
