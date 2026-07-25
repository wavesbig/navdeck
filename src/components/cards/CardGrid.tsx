import type {Card as CardType, CardStatus, NetworkMode} from '@/types';
import {CardItem} from '@/components/cards/CardItem';

interface CardGridProps {
  cards: CardType[];
  /** 卡片状态映射（cardId → status） */
  statuses?: Record<string, CardStatus>;
  /** 网络模式（决定卡片点击跳转 URL） */
  networkMode?: NetworkMode;
  onEditCard?: (card: CardType) => void;
  onDeleteCard?: (card: CardType) => void;
  /** 点击卡片时触发（fire-and-forget 单卡片探测） */
  onCardClick?: (cardId: string) => void;
}

/**
 * 卡片网格（只读模式，不参与拖拽）
 *
 * 视觉规范（ui-spec §4.5）：
 * - 用 flex-wrap + justify-start 让卡片紧密排列、行末自动换行、整体居左
 * - 卡片宽度固定 80px，gap-4（16px）
 *
 * 拖拽由 SortableCardGrid 在外层接入 DndKit 实现
 */
export function CardGrid({
  cards,
  statuses,
  networkMode = 'auto',
  onEditCard,
  onDeleteCard,
  onCardClick,
}: CardGridProps) {
  return (
    <div className="flex flex-wrap gap-4 justify-start">
      {cards.map((card) => (
        <CardItem
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
  );
}

/** 根据网络模式选择卡片 URL */
export function getCardUrl(
  card: CardType,
  mode: NetworkMode
): string {
  switch (mode) {
    case 'internal':
      return card.internalUrl;
    case 'external':
      return card.externalUrl;
    case 'auto':
    default:
      return card.externalUrl;
  }
}
