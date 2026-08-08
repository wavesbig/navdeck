'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardItem } from '@/components/cards/CardItem';
import type { Card, CardStatus } from '@/types';

interface SortableCardItemProps {
  card: Card;
  status?: CardStatus;
  href: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /**
   * 是否处于排序模式。
   * - true：卡片可拖拽（listeners 绑到外层），CardItem 禁用点击跳转/右键菜单
   * - false：卡片不可拖（disabled），CardItem 正常交互
   */
  reorderMode?: boolean;
}

/**
 * 可拖拽的卡片项
 *
 * - 排序模式由父组件通过 reorderMode 控制（编辑态入口在 FloatingToolbar）
 * - reorderMode=true：整个卡片可拖拽，isDragging 时原位置变虚线占位符
 * - reorderMode=false：disabled，卡片作为普通 CardItem 交互（点击跳转）
 *
 * 不再有拖拽手柄按钮：编辑态下直接按住卡片即可拖拽，
 * PointerSensor activationConstraint distance:5 保证普通点击不会误触发拖拽。
 *
 * dnd-kit 的 useSortable 会在 DOM 上注入 aria-describedby（DndDescribedBy-{n}），
 * 其 ID 用全局计数器生成，SSR 与 client hydration 起点不同导致 ID 不匹配。
 * 这是 dnd-kit 已知问题（#1018 #1068），client hydrate 后会被修正，
 * 故在外层 div 加 suppressHydrationWarning 抑制告警。
 */
export function SortableCardItem({
  card,
  status,
  href,
  onClick,
  onEdit,
  onDelete,
  reorderMode = false,
}: SortableCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    disabled: !reorderMode,
    // 让位动画：150ms 过短导致 over 快速切换时 transition 频繁被打断 → 闪烁
    // 200ms + ease（非 ease-out）起止更平滑，兼顾响应感与流畅度
    transition: { duration: 200, easing: 'ease' },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      suppressHydrationWarning
      // isDragging 时仅半透明占位（DragOverlay 渲染拖拽预览）
      className={`${isDragging ? 'opacity-30' : ''}`}
      {...(reorderMode ? { ...attributes, ...listeners } : {})}
    >
      <CardItem
        card={card}
        status={status}
        href={href}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDelete}
        interactive={!reorderMode}
      />
    </div>
  );
}
