import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import type {Card as CardType, CardStatus, NetworkMode} from '@/types';
import {CardGrid} from '@/components/cards/CardGrid';
import {SortableCardGrid} from '@/components/dnd/SortableCardGrid';

interface CategorySectionProps {
  /** 分类名称（null = 未分类） */
  title: string | null;
  cards: CardType[];
  statuses?: Record<string, CardStatus>;
  networkMode?: NetworkMode;
  onEditCard?: (card: CardType) => void;
  onDeleteCard?: (card: CardType) => void;
  /** 点击卡片时触发（fire-and-forget 单卡片探测） */
  onCardClick?: (cardId: string) => void;
  /** 是否启用拖拽（默认 false，外层 DndContext 控制） */
  sortable?: boolean;
}

/**
 * 分类分区
 *
 * 视觉规范（ui-spec §2.6 + §4.5）：
 * - 分类标题：小字号 + muted 色，无横线无下划线
 * - 分组间 py-4 留白（紧凑）
 * - 标题到网格 mb-2
 * - 未分类排最后
 *
 * sortable=true 时用 SortableCardGrid（卡片可拖拽），
 * 外层必须包在 DndContext 内。
 */
export function CategorySection({
  title,
  cards,
  statuses,
  networkMode = 'auto',
  onEditCard,
  onDeleteCard,
  onCardClick,
  sortable = false,
}: CategorySectionProps) {
  if (cards.length === 0) return null;

  const displayTitle = title ?? '未分类';

  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <Heading level={5} className="mb-2 text-secondary font-medium">
        {displayTitle}
        <Text as="span" size="sm" color="secondary" className="ml-2">
          ({cards.length})
        </Text>
      </Heading>

      {sortable ? (
        <SortableCardGrid
          cards={cards}
          statuses={statuses}
          networkMode={networkMode}
          onEditCard={onEditCard}
          onDeleteCard={onDeleteCard}
          onCardClick={onCardClick}
        />
      ) : (
        <CardGrid
          cards={cards}
          statuses={statuses}
          networkMode={networkMode}
          onEditCard={onEditCard}
          onDeleteCard={onDeleteCard}
          onCardClick={onCardClick}
        />
      )}
    </section>
  );
}
