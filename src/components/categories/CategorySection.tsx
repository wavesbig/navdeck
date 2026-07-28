import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Plus } from 'lucide-react';
import { CardGrid } from '@/components/cards/CardGrid';
import { CategoryBadge } from '@/components/categories/CategoryBadge';
import { SortableCardGrid } from '@/components/dnd/SortableCardGrid';
import type { CardStatus, Card as CardType, NetworkMode } from '@/types';

interface CategorySectionProps {
  /** 分类名称（null = 未分类） */
  title: string | null;
  /** 分类图标名（kebab-case） */
  icon?: string | null;
  /** 分类强调色（hex） */
  color?: string | null;
  cards: CardType[];
  statuses?: Record<string, CardStatus>;
  networkMode?: NetworkMode;
  onEditCard?: (card: CardType) => void;
  onDeleteCard?: (card: CardType) => void;
  /** 点击卡片时触发（fire-and-forget 单卡片探测） */
  onCardClick?: (cardId: string) => void;
  /** 标题右侧的新建入口（categoryId 由父组件闭包绑定） */
  onAddCard?: () => void;
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
 * 新建入口设计：
 * - + IconButton 紧挨标题文字右侧（在同一个 HStack 内）
 * - hover 标题行时淡入显示，平时隐藏，符合 Notion / Linear 模式
 * - 移动端无 hover，默认显示
 * - tooltip 提示"新建卡片"
 *
 * sortable=true 时用 SortableCardGrid（卡片可拖拽），
 * 外层必须包在 DndContext 内。
 */
export function CategorySection({
  title,
  icon,
  color,
  cards,
  statuses,
  networkMode = 'auto',
  onEditCard,
  onDeleteCard,
  onCardClick,
  onAddCard,
  sortable = false,
}: CategorySectionProps) {
  if (cards.length === 0) return null;

  const displayTitle = title ?? '未分类';

  return (
    <section className="group py-4 first:pt-0 last:pb-0">
      <HStack gap={1.5} align="center" className="mb-2">
        {(icon || color) && (
          <CategoryBadge
            name={displayTitle}
            icon={icon}
            color={color}
          />
        )}
        <Heading level={5} className="text-secondary font-medium">
          {displayTitle}
        </Heading>
        {onAddCard && (
          <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
            <IconButton
              label={`新建卡片到${displayTitle}`}
              icon={<Plus size={14} />}
              variant="ghost"
              size="sm"
              tooltip="新建卡片"
              onClick={onAddCard}
            />
          </span>
        )}
      </HStack>

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
