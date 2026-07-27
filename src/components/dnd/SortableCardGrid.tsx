'use client';

import {SortableContext, rectSortingStrategy} from '@dnd-kit/sortable';
import type {Card, CardStatus, NetworkMode} from '@/types';
import {SortableCardItem} from '@/components/dnd/SortableCardItem';
import {getCardUrl} from '@/components/cards/CardGrid';

interface SortableCardGridProps {
  cards: Card[];
  statuses?: Record<string, CardStatus>;
  networkMode?: NetworkMode;
  onEditCard?: (card: Card) => void;
  onDeleteCard?: (card: Card) => void;
  /** 点击卡片时触发（fire-and-forget 单卡片探测） */
  onCardClick?: (cardId: string) => void;
}

/**
 * 可拖拽卡片网格
 *
 * - 用 SortableContext + rectSortingStrategy 适配矩形布局
 * - 每项用 SortableCardItem（带拖拽手柄）
 * - 跨分类拖拽由外层 DndContext 协调
 * - flex-wrap + justify-start：卡片紧密排列，行末自动换行，整体居左
 *
 * 新建入口不在网格末尾，而在 CategorySection 标题行右侧的 IconButton，
 * 避免占位卡片破坏 SortableContext items 计算（dnd-kit 会把非 sortable
 * 子元素误识别为 sortable item）。
 */
export function SortableCardGrid({
  cards,
  statuses,
  networkMode = 'auto',
  onEditCard,
  onDeleteCard,
  onCardClick,
}: SortableCardGridProps) {
  return (
    <SortableContext
      items={cards.map((c) => c.id)}
      strategy={rectSortingStrategy}
    >
      <div className="flex flex-wrap gap-4 justify-start">
        {cards.map((card) => (
          <SortableCardItem
            key={card.id}
            card={card}
            status={statuses?.[card.id] ?? 'unknown'}
            href={getCardUrl(card, networkMode)}
            onClick={onCardClick ? () => onCardClick(card.id) : undefined}
            onEdit={onEditCard ? () => onEditCard(card) : undefined}
            onDelete={onDeleteCard ? () => onDeleteCard(card) : undefined}
          />
        ))}
      </div>
    </SortableContext>
  );
}
