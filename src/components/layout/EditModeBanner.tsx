'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EDIT_MODE_CHANGE_EVENT } from '@/components/layout/edit-mode-event';

/**
 * 编辑态底部提示条
 *
 * - 监听 FloatingToolbar 的 edit-mode-change 事件
 * - 编辑态时从底部滑入，提示「拖拽排序 · ESC 退出」
 * - 与 FloatingToolbar 同族的 surface 浮层；图标 + 文案提高编辑态辨识度
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
    <HStack
      justify="center"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 edit-banner-enter"
    >
      <HStack
        align="center"
        gap={2}
        paddingInline={4}
        paddingBlock={2}
        className="rounded-widget bg-surface/85 text-primary border border-border shadow-lg backdrop-blur-md"
      >
        <Pencil size={16} aria-hidden="true" />
        <Text type="label">编辑模式 · 拖拽排序 · ESC 退出</Text>
      </HStack>
    </HStack>
  );
}
