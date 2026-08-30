import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Plus } from 'lucide-react';
import { CardGrid } from '@/components/cards/CardGrid';
import { SortableCardGrid } from '@/components/cards/SortableCardGrid';
import { CategoryBadge } from '@/components/categories/CategoryBadge';
import type { CardStatus, Card as CardType, NetworkMode } from '@/types';

interface CategorySectionProps {
  /** 分类名称（null = 未分类） */
  title: string | null;
  /** 分类图标名（kebab-case） */
  icon?: string | null;
  /** 分类强调色（hex） */
  color?: string | null;
  /** 分类 ID（null = 未分类），透传给 SortableCardGrid 作 droppable id */
  categoryId?: string | null;
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
  /** 是否处于排序模式（透传给 SortableCardGrid） */
  reorderMode?: boolean;
  /** 当前正在拖拽的卡片（跨分类拖拽时在目标分类插入位置渲染半透明预览） */
  activeCard?: CardType | null;
}

/**
 * 分类分区
 *
 * 视觉规范（ui-spec §2.6 + §4.5）：
 * - 分类标题：Heading level=4（base 字号 14px + bold），primary 色，无横线无下划线
 * - 分类徽章：md 尺寸（32px），与标题视觉重量匹配
 * - 分组间 py-5 留白（与卡片间距 gap-5 同档）
 * - 标题到网格 mb-3
 * - 未分类排最后
 *
 * 新建入口设计：
 * - + IconButton 紧挨标题文字右侧（在同一个 HStack 内）
 * - 默认隐藏，hover 或 focus-within 当前分类时淡入显示，符合 Notion / Linear 模式
 * - tooltip 提示"新建卡片"
 *
 * sortable=true 时用 SortableCardGrid（卡片可拖拽），
 * 外层必须包在 DndContext 内。
 */
export function CategorySection({
  title,
  icon,
  color,
  categoryId = null,
  cards,
  statuses,
  networkMode = 'auto',
  onEditCard,
  onDeleteCard,
  onCardClick,
  onAddCard,
  sortable = false,
  reorderMode = false,
  activeCard = null,
}: CategorySectionProps) {
  if (cards.length === 0) return null;

  const displayTitle = title ?? '未分类';

  return (
    <section className="group py-5 first:pt-0 last:pb-0">
      <HStack gap={1.5} align="center" className="mb-3">
        {(icon || color) && (
          <CategoryBadge
            name={displayTitle}
            icon={icon}
            color={color}
            size="md"
          />
        )}
        <Heading level={4} className="text-primary">
          {displayTitle}
        </Heading>
        {onAddCard && (
          <span
            className={`transition-opacity ${
              reorderMode
                ? 'opacity-0 pointer-events-none'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          >
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
          reorderMode={reorderMode}
          categoryId={categoryId}
          activeCard={activeCard}
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
