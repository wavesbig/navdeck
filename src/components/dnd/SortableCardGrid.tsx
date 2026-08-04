'use client';

import { useDndContext, useDroppable } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { getCardUrl } from '@/components/cards/CardGrid';
import { CardItem } from '@/components/cards/CardItem';
import { SortableCardItem } from '@/components/dnd/SortableCardItem';
import type { Card, CardStatus, NetworkMode } from '@/types';

interface SortableCardGridProps {
  cards: Card[];
  statuses?: Record<string, CardStatus>;
  networkMode?: NetworkMode;
  onEditCard?: (card: Card) => void;
  onDeleteCard?: (card: Card) => void;
  /** 点击卡片时触发（fire-and-forget 单卡片探测） */
  onCardClick?: (cardId: string) => void;
  /** 是否处于排序模式（透传给 SortableCardItem） */
  reorderMode?: boolean;
  /** 分类 ID（null = 未分类），用于跨分类 droppable */
  categoryId: string | null;
  /** 当前正在拖拽的卡片（跨分类时在插入位置渲染半透明预览） */
  activeCard?: Card | null;
}

/**
 * 可拖拽卡片网格
 *
 * - 每个分类独立 SortableContext（同分类内自动让位动画）
 * - 外层 useDroppable 让分类区域（含空白）可作为跨分类 drop target
 *
 * 跨分类预览实现（margin 过渡方案）：
 * - 不再通过 DOM 插入/删除渲染预览（会导致无过渡的布局跳动 = 闪烁）
 * - 改为在插入位置的卡片 wrapper 上施加 marginLeft/marginRight，
 *   用 CSS transition 平滑过渡 margin 变化
 * - 预览卡片以 absolute 定位渲染在 margin 空间内
 * - insertIndex 切换时，旧位置 margin 收缩 + 新位置 margin 扩张
 *   同时进行（同 duration），总空间近似不变 → 后续卡片不跳动
 */
export function SortableCardGrid({
  cards,
  statuses,
  networkMode = 'auto',
  onEditCard,
  onDeleteCard,
  onCardClick,
  reorderMode = false,
  categoryId,
  activeCard = null,
}: SortableCardGridProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `category:${categoryId ?? 'null'}`,
    disabled: !reorderMode,
  });

  // 从 DndContext 获取 active/over，判断是否跨分类拖拽
  const { active, over } = useDndContext();
  const activeId = active?.id as string | undefined;
  const overId = over?.id as string | undefined;

  // 跨分类拖拽：active 不在本分类卡片中
  const isForeignActive =
    activeId != null && !cards.some((c) => c.id === activeId);

  // over 指向本分类哪张卡片
  const overCardIndex =
    overId != null ? cards.findIndex((c) => c.id === overId) : -1;
  // over 指向本分类空白区
  const isOverCategoryDroppable = overId === `category:${categoryId ?? 'null'}`;

  // 判断鼠标（active 中心 X）在 over 卡片中心的左还是右
  // 右半部分 → 插入到该卡片后面；左半部分 → 插入到该卡片前面
  // 这样可以拖到最后一张卡片的右侧实现"追加到末尾"
  const overRect = over?.rect;
  const activeRect = active?.rect?.current?.translated;
  const activeCenterX =
    overRect && activeRect ? activeRect.left + activeRect.width / 2 : 0;
  const overCenterX = overRect ? overRect.left + overRect.width / 2 : 0;
  const insertAfter = activeCenterX > overCenterX;

  // 插入位置索引（-1 = 不显示预览）
  let insertIndex = -1;
  if (isForeignActive && activeCard) {
    if (overCardIndex >= 0) {
      insertIndex = insertAfter ? overCardIndex + 1 : overCardIndex;
    } else if (isOverCategoryDroppable) {
      insertIndex = cards.length;
    }
  }

  // 卡片宽度（与 CardItem 一致）
  const CARD_WIDTH = 80;
  // marginLeft/marginRight 的值：等于卡片宽度，gap 由 flex gap-4 提供
  const PREVIEW_MARGIN = `${CARD_WIDTH}px`;

  return (
    <SortableContext
      items={cards.map((c) => c.id)}
      strategy={rectSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={`flex flex-wrap gap-4 justify-start min-h-[40px] rounded-lg transition-colors ${
          isOver && isForeignActive
            ? 'bg-accent/10 ring-2 ring-accent/40 ring-inset'
            : ''
        }`}
      >
        {cards.map((card, idx) => {
          // 在 insertIndex 位置的卡片前插入预览（marginLeft 腾出空间）
          const showPreviewBefore =
            isForeignActive &&
            activeCard &&
            idx === insertIndex &&
            insertIndex < cards.length;
          // 末尾追加：最后一张卡片的 marginRight 腾出空间
          const showPreviewAfter =
            isForeignActive &&
            activeCard &&
            idx === cards.length - 1 &&
            insertIndex === cards.length;

          return (
            <div
              key={card.id}
              className="relative"
              style={{
                marginLeft: showPreviewBefore ? PREVIEW_MARGIN : '0px',
                marginRight: showPreviewAfter ? PREVIEW_MARGIN : '0px',
                transition: 'margin 200ms ease-out',
              }}
            >
              {showPreviewBefore && activeCard && (
                <div
                  className="absolute top-0 w-[80px] opacity-30 pointer-events-none"
                  style={{ left: `-${CARD_WIDTH}px` }}
                >
                  <CardItem card={activeCard} href="#" />
                </div>
              )}
              {showPreviewAfter && activeCard && (
                <div
                  className="absolute top-0 w-[80px] opacity-30 pointer-events-none"
                  style={{ right: `-${CARD_WIDTH}px` }}
                >
                  <CardItem card={activeCard} href="#" />
                </div>
              )}
              <SortableCardItem
                card={card}
                status={statuses?.[card.id] ?? 'unknown'}
                href={getCardUrl(card, networkMode)}
                onClick={onCardClick ? () => onCardClick(card.id) : undefined}
                onEdit={onEditCard ? () => onEditCard(card) : undefined}
                onDelete={onDeleteCard ? () => onDeleteCard(card) : undefined}
                reorderMode={reorderMode}
              />
            </div>
          );
        })}
      </div>
    </SortableContext>
  );
}
