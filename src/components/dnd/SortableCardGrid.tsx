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
 * - 用 SortableContext + rectSortingStrategy 适配网格布局
 * - 每项用 SortableCardItem（带拖拽手柄）
 * - 跨分类拖拽由外层 DndContext 协调
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
      <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-3 justify-items-center">
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
