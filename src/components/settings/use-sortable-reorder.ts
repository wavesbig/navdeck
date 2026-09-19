'use client';

import {
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback } from 'react';

interface SortableReorderOptions<T> {
  items: T[];
  getId: (item: T) => string;
  /** 提交新数组（乐观更新），失败时回滚到旧数组 */
  setItems: (next: T[]) => void;
  reorder: (items: Array<{ id: string; order: number }>) => Promise<unknown>;
  /** 持久化失败提示（调用方 toast） */
  onError: () => void;
}

/**
 * 设置页可排序列表的 DnD 脚手架：
 * PointerSensor 防误触 + 拖拽结束乐观更新 + 失败回滚。
 * 键盘排序（KeyboardSensor）在后续阶段接入此收口点。
 */
export function useSortableReorder<T>({
  items,
  getId,
  setItems,
  reorder,
  onError,
}: SortableReorderOptions<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => getId(item) === active.id);
      const newIndex = items.findIndex((item) => getId(item) === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      setItems(reordered);

      try {
        await reorder(
          reordered.map((item, index) => ({ id: getId(item), order: index })),
        );
      } catch {
        onError();
        setItems(items);
      }
    },
    [items, getId, setItems, reorder, onError],
  );

  return { sensors, handleDragEnd };
}
