'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

interface SortableRowProps {
  /** dnd-kit 排序 id */
  id: string;
  children: ReactNode;
}

/**
 * 设置页可排序列表行脚手架：拖拽手柄 + 行容器。
 * 行内内容（徽章 / 名称 / 操作按钮）由 children 提供。
 */
export function SortableRow({ id, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-3 p-3 bg-surface hover:bg-overlay-hover transition-colors border-b border-border last:border-b-0"
      suppressHydrationWarning
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-secondary hover:text-primary touch-none focus-ring"
        aria-label="拖拽排序"
        suppressHydrationWarning
      >
        <GripVertical size={16} />
      </button>
      {children}
    </div>
  );
}
