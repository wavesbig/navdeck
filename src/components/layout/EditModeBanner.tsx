'use client';

import { useEffect, useState } from 'react';
import { EDIT_MODE_CHANGE_EVENT } from '@/components/layout/FloatingToolbar';

/**
 * 编辑态顶部提示条
 *
 * - 监听 FloatingToolbar 的 edit-mode-change 事件
 * - 编辑态时从顶部滑入，提示「拖拽排序 · ESC 退出」
 * - 卡片/widget 不做任何视觉装饰，最克制的编辑态反馈
 */
export function EditModeBanner() {
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setEditMode((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener(EDIT_MODE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(EDIT_MODE_CHANGE_EVENT, handler);
  }, []);

  if (!editMode) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none edit-banner-enter">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/85 backdrop-blur-md border border-border shadow-lg text-sm font-medium text-primary">
        <span className="size-1.5 rounded-full bg-accent" />
        <span>编辑模式 · 拖拽排序 · ESC 退出</span>
      </div>
    </div>
  );
}
