'use client';

import {CSS} from '@dnd-kit/utilities';
import {useSortable} from '@dnd-kit/sortable';
import {GripVertical} from 'lucide-react';
import type {Card, CardStatus} from '@/types';
import {CardItem} from '@/components/cards/CardItem';

interface SortableCardItemProps {
  card: Card;
  status?: CardStatus;
  href: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * 可拖拽的卡片项
 *
 * - 卡片本体仍是 <a>（点击跳转）
 * - 拖拽手柄 ⠿ 浮在卡片左侧（hover 显示），按住手柄才触发拖拽
 * - isDragging 时：原位置变虚线占位符，DragOverlay 渲染拖拽预览
 */
export function SortableCardItem({
  card,
  status,
  href,
  onClick,
  onEdit,
  onDelete,
}: SortableCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id: card.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? // 占位符：虚线轮廓 + 半透明，保留布局占位
            'opacity-40 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5'
          : ''
      }
    >
      <div className="relative group/sortable">
        {/* 拖拽手柄（hover 显示，cursor-grab） */}
        <button
          type="button"
          className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/sortable:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-secondary hover:text-primary p-0.5"
          aria-label="拖拽排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>

        <CardItem
          card={card}
          status={status}
          href={href}
          onClick={onClick}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
