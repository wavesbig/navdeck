'use client';

import {CSS} from '@dnd-kit/utilities';
import {useSortable} from '@dnd-kit/sortable';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type {ReactNode} from 'react';

interface SortableListProps<T extends {id: string}> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  /** 拖拽结束回调，items 已按新顺序排好 */
  onReorder: (items: T[]) => void;
}

/**
 * 垂直列表拖拽（分类管理用，M1.9 接入）
 *
 * 简单包装 SortableContext + verticalListSortingStrategy
 */
export function SortableList<T extends {id: string}>({
  items,
  renderItem,
}: SortableListProps<T>) {
  return (
    <SortableContext
      items={items.map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      {items.map((item) => (
        <SortableListItemWrapper key={item.id} id={item.id}>
          {renderItem(item)}
        </SortableListItemWrapper>
      ))}
    </SortableContext>
  );
}

function SortableListItemWrapper({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
