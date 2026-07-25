import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import type {Card as CardType} from '@/types';
import {CardGrid} from '@/components/cards/CardGrid';

interface CategorySectionProps {
  /** 分类名称（null = 未分类） */
  title: string | null;
  cards: CardType[];
  statuses?: Record<string, 'online' | 'offline' | 'unknown'>;
  networkMode?: 'auto' | 'internal' | 'external';
  onEditCard?: (card: CardType) => void;
  onDeleteCard?: (card: CardType) => void;
}

/**
 * 分类分区
 *
 * 视觉规范（ui-spec §2.6 + §4.5）：
 * - 分类标题：小字号 + muted 色，无横线无下划线
 * - 分组间 py-8 留白
 * - 标题到网格 py-4
 * - 未分类排最后
 */
export function CategorySection({
  title,
  cards,
  statuses,
  networkMode = 'auto',
  onEditCard,
  onDeleteCard,
}: CategorySectionProps) {
  if (cards.length === 0) return null;

  const displayTitle = title ?? '未分类';

  return (
    <section className="py-8 first:pt-0 last:pb-0">
      <Heading level={5} className="mb-4 text-secondary font-medium">
        {displayTitle}
        <Text as="span" size="sm" color="secondary" className="ml-2">
          ({cards.length})
        </Text>
      </Heading>

      <CardGrid
        cards={cards}
        statuses={statuses}
        networkMode={networkMode}
        onEditCard={onEditCard}
        onDeleteCard={onDeleteCard}
      />
    </section>
  );
}
