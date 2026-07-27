import { CardItem } from '@/components/cards/CardItem';
import type { CardStatus, Card as CardType, NetworkMode } from '@/types';

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
 * 视觉规范（ui-spec §4.5 + T1.11.9 响应式）：
 * - CSS Grid + 显式断点：移动 2 列 / 平板 3-4 列 / 桌面 5 列
 * - 卡片视觉宽度固定 80px，grid item 内居中（justify-items-center）
 * - gap-4（16px）
 *
 * 新建入口不在网格末尾，而在 CategorySection 标题行右侧的 IconButton，
 * 避免占位卡片破坏网格视觉、占用空间。
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
    <div className="grid grid-cols-2 gap-4 justify-items-center sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
export function getCardUrl(card: CardType, mode: NetworkMode): string {
  switch (mode) {
    case 'internal':
      return card.internalUrl;
    case 'external':
      return card.externalUrl;
    default:
      return card.externalUrl;
  }
}
