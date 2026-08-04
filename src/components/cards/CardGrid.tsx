import { CardItem } from '@/components/cards/CardItem';
import { getCardUrl } from '@/components/cards/card-url';
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
 * 视觉规范（ui-spec §4.5）：
 * - flex-wrap + justify-start：卡片紧密排列、行末自动换行、整体居左
 * - 卡片宽度固定 80px，gap-4（16px）
 * - 列数自适应容器宽度（每列 80px + 16px gap），不会因断点抖动
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
    <div className="flex flex-wrap gap-4 justify-start stagger-cards">
      {cards.map((card, idx) => (
        <div
          key={card.id}
          style={{ animationDelay: `${Math.min(idx, 20) * 40}ms` }}
        >
          <CardItem
            card={card}
            status={statuses?.[card.id] ?? 'unknown'}
            href={getCardUrl(card, networkMode)}
            onClick={onCardClick ? () => onCardClick(card.id) : undefined}
            onEdit={onEditCard ? () => onEditCard(card) : undefined}
            onDelete={onDeleteCard ? () => onDeleteCard(card) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
