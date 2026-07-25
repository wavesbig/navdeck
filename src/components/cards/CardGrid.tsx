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
 * - 桌面 ≥1280px：6 列
 * - 平板 768-1279px：4 列
 * - 手机 <768px：3 列
 * - gap-3（12px）
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
    <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-3 justify-items-center">
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
