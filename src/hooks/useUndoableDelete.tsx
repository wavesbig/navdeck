'use client';

import { useToast } from '@astryxdesign/core/Toast';
import { useCallback } from 'react';

interface UndoableDeleteOptions {
  /** 被删除项的显示名称 */
  label: string;
  /** 5 秒超时后执行的实际删除（持久化） */
  onConfirm: () => void | Promise<void>;
  /** 用户点击撤销时执行的恢复操作 */
  onUndo: () => void;
}

/**
 * 可撤销删除 hook
 *
 * 基于 Astryx Toast 的 endContent 实现撤销按钮：
 * 1. 调用 scheduleDelete → 显示 toast「已删除「xxx」 [撤销]」
 * 2. 5 秒超时 → onConfirm（持久化删除）
 * 3. 点击撤销 → onUndo（恢复 UI）→ 关闭 toast
 *
 * 调用方负责乐观更新（立即从 UI 移除）和恢复（撤销时放回去）。
 */
export function useUndoableDelete() {
  const showToast = useToast();

  const scheduleDelete = useCallback(
    (options: UndoableDeleteOptions) => {
      let undone = false;

      const dismiss = showToast({
        body: `已删除「${options.label}」`,
        type: 'info',
        isAutoHide: true,
        autoHideDuration: 5000,
        endContent: (
          <button
            type="button"
            onClick={() => {
              if (undone) return;
              undone = true;
              options.onUndo();
              dismiss();
            }}
            className="text-primary font-medium hover:underline cursor-pointer"
          >
            撤销
          </button>
        ),
        onHide: (reason) => {
          if (reason === 'auto' && !undone) {
            options.onConfirm();
          }
        },
      });
    },
    [showToast],
  );

  return { scheduleDelete };
}
