import type {Card as CardType} from '@/types';
import {CardItem} from '@/components/cards/CardItem';

interface CardGridProps {
  cards: CardType[];
  /** 卡片状态映射（cardId → status） */
  statuses?: Record<string, 'online' | 'offline' | 'unknown'>;
  /** 网络模式（决定卡片点击跳转 URL） */
  networkMode?: 'auto' | 'internal' | 'external';
  onEditCard?: (card: CardType) => void;
  onDeleteCard?: (card: CardType) => void;
}

/**
 * 卡片网格
 *
 * 视觉规范（ui-spec §4.5）：
 * - 桌面 ≥1280px：6 列
 * - 平板 768-1279px：4 列
 * - 手机 <768px：3 列
 * - gap-3（12px）
 */
export function CardGrid({
  cards,
  statuses,
  networkMode = 'auto',
  onEditCard,
  onDeleteCard,
}: CardGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-3">
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          status={statuses?.[card.id] ?? 'unknown'}
          href={getCardUrl(card, networkMode)}
          onEdit={onEditCard ? () => onEditCard(card) : undefined}
          onDelete={onDeleteCard ? () => onDeleteCard(card) : undefined}
        />
      ))}
    </div>
  );
}

/** 根据网络模式选择卡片 URL */
function getCardUrl(
  card: CardType,
  mode: 'auto' | 'internal' | 'external'
): string {
  switch (mode) {
    case 'internal':
      return card.internalUrl;
    case 'external':
      return card.externalUrl;
    case 'auto':
    default:
      // auto 模式：默认走外网，M1.6 状态检测后由父组件动态决定
      return card.externalUrl;
  }
}
