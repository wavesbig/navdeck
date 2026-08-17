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
 * 4. 5 秒内刷新/关闭页面 → pagehide 时立即 flush 所有待确认的 onConfirm
 *
 * 调用方负责乐观更新（立即从 UI 移除）和恢复（撤销时放回去）。
 */
/**
 * 待确认删除注册表（模块级，跨组件共享）
 *
 * 5 秒撤销计时器挂在 toast 生命周期上，页面刷新/关闭会把计时器一起销毁，
 * 导致删除请求从未发出（用户感知：删了一刷新又回来）。
 * pagehide 时统一 flush 所有待确认的删除，配合请求层 keepalive 保证发完。
 */
const pendingConfirms = new Set<() => void>();
let flushListenerRegistered = false;

function registerFlushListener() {
  if (flushListenerRegistered || typeof window === 'undefined') return;
  flushListenerRegistered = true;
  window.addEventListener('pagehide', () => {
    for (const confirm of [...pendingConfirms]) confirm();
  });
}

export function useUndoableDelete() {
  const showToast = useToast();

  const scheduleDelete = useCallback(
    (options: UndoableDeleteOptions) => {
      registerFlushListener();
      // settled 保证 confirm/undo 只生效一次（toast 超时、撤销、pagehide flush 互斥）
      let settled = false;
      const confirm = () => {
        if (settled) return;
        settled = true;
        pendingConfirms.delete(confirm);
        options.onConfirm();
      };
      pendingConfirms.add(confirm);

      const dismiss = showToast({
        body: `已删除「${options.label}」`,
        type: 'info',
        isAutoHide: true,
        autoHideDuration: 5000,
        endContent: (
          <button
            type="button"
            onClick={() => {
              if (settled) return;
              settled = true;
              pendingConfirms.delete(confirm);
              options.onUndo();
              dismiss();
            }}
            className="text-primary font-medium hover:underline cursor-pointer"
          >
            撤销
          </button>
        ),
        onHide: (reason) => {
          if (reason === 'auto') {
            confirm();
          }
        },
      });
    },
    [showToast],
  );

  return { scheduleDelete };
}
