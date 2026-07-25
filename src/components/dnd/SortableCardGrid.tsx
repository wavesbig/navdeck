'use client';

import {SortableContext, rectSortingStrategy} from '@dnd-kit/sortable';
import type {Card} from '@/types';
import {SortableCardItem} from '@/components/dnd/SortableCardItem';
import {getCardUrl} from '@/components/cards/CardGrid';

interface SortableCardGridProps {
  cards: Card[];
  statuses?: Record<string, 'online' | 'offline' | 'unknown'>;
  networkMode?: 'auto' | 'internal' | 'external';
  onEditCard?: (card: Card) => void;
  onDeleteCard?: (card: Card) => void;
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
}: SortableCardGridProps) {
  return (
    <SortableContext
      items={cards.map((c) => c.id)}
      strategy={rectSortingStrategy}
    >
      <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-3">
        {cards.map((card) => (
          <SortableCardItem
            key={card.id}
            card={card}
            status={statuses?.[card.id] ?? 'unknown'}
            href={getCardUrl(card, networkMode)}
            onEdit={onEditCard ? () => onEditCard(card) : undefined}
            onDelete={onDeleteCard ? () => onDeleteCard(card) : undefined}
          />
        ))}
      </div>
    </SortableContext>
  );
}
