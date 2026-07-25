'use client';

import {useState, useCallback} from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Button} from '@astryxdesign/core/Button';
import {Plus} from 'lucide-react';
import type {Card, CardReorderItem, Category, NetworkMode} from '@/types';
import {CategorySection} from '@/components/categories/CategorySection';
import {CardEditModal} from '@/components/cards/CardEditModal';
import {CardItem} from '@/components/cards/CardItem';
import {getCardUrl} from '@/components/cards/CardGrid';
import {useCardStatuses} from '@/hooks/useCardStatuses';

interface HomeContentProps {
  categories: Category[];
  unclassifiedCards: Card[];
  networkMode: NetworkMode;
}

/** 找到卡片所在分组（categoryId 为 null 表示未分类） */
function locateCard(
  cardId: string,
  categories: Category[],
  unclassified: Card[]
): {categoryId: string | null} | null {
  for (const cat of categories) {
    if (cat.cards?.some((c) => c.id === cardId)) {
      return {categoryId: cat.id};
    }
  }
  if (unclassified.some((c) => c.id === cardId)) {
    return {categoryId: null};
  }
  return null;
}

/** 按 id 查找卡片 */
function findCardById(
  cardId: string,
  categories: Category[],
  unclassified: Card[]
): Card | null {
  for (const cat of categories) {
    const found = cat.cards?.find((c) => c.id === cardId);
    if (found) return found;
  }
  return unclassified.find((c) => c.id === cardId) ?? null;
}

/** 调用 reorder API 持久化 */
async function persistReorder(items: CardReorderItem[]) {
  try {
    await fetch('/api/cards/reorder', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({items}),
    });
  } catch (e) {
    console.error('reorder failed', e);
  }
}

/**
 * 主页内容区
 *
 * - 有卡片时：分类分区纵向铺开 + 未分类排最后 + DndContext 跨分类拖拽
 * - 空状态：EmptyState 引导
 */
export function HomeContent({categories, unclassifiedCards, networkMode}: HomeContentProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // 本地状态：分类（含卡片）+ 未分类卡片
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [localUnclassified, setLocalUnclassified] = useState<Card[]>(unclassifiedCards);

  // 状态灯批量探测 + 网络模式切换重探测
  const {statuses, refreshOne} = useCardStatuses();

  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 5}})
  );

  const hasCards =
    localCategories.some((c) => c.cards && c.cards.length > 0) ||
    localUnclassified.length > 0;

  const handleNewCard = () => {
    setEditingCard(null);
    setModalOpen(true);
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setModalOpen(true);
  };

  const handleDeleteCard = async (card: Card) => {
    if (!confirm(`确认删除「${card.name}」吗？`)) return;
    const res = await fetch(`/api/cards/${card.id}`, {method: 'DELETE'});
    if (res.ok) {
      window.location.reload();
    } else {
      alert('删除失败');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const card = findCardById(id, localCategories, localUnclassified);
    setActiveCard(card);
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const {active, over} = event;
      setActiveCard(null);

      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // 找到 active 和 over 所属的分组
      const activeLoc = locateCard(activeId, localCategories, localUnclassified);
      const overLoc = locateCard(overId, localCategories, localUnclassified);

      if (!activeLoc || !overLoc) return;

      // 同分类内排序
      if (activeLoc.categoryId === overLoc.categoryId) {
        const cards =
          activeLoc.categoryId === null
            ? [...localUnclassified]
            : [...(localCategories.find((c) => c.id === activeLoc.categoryId)?.cards ?? [])];

        const oldIndex = cards.findIndex((c) => c.id === activeId);
        const newIndex = cards.findIndex((c) => c.id === overId);

        if (oldIndex === -1 || newIndex === -1) return;

        // 交换位置
        const [moved] = cards.splice(oldIndex, 1);
        cards.splice(newIndex, 0, moved);

        // 更新本地状态
        if (activeLoc.categoryId === null) {
          setLocalUnclassified(cards);
        } else {
          setLocalCategories((prev) =>
            prev.map((c) =>
              c.id === activeLoc.categoryId ? {...c, cards} : c
            )
          );
        }

        // 持久化
        void persistReorder(
          cards.map((c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: activeLoc.categoryId,
          }))
        );
      } else {
        // 跨分类拖拽：从 activeLoc 移到 overLoc
        const fromCards =
          activeLoc.categoryId === null
            ? [...localUnclassified]
            : [...(localCategories.find((c) => c.id === activeLoc.categoryId)?.cards ?? [])];
        const toCards =
          overLoc.categoryId === null
            ? [...localUnclassified]
            : [...(localCategories.find((c) => c.id === overLoc.categoryId)?.cards ?? [])];

        const fromIndex = fromCards.findIndex((c) => c.id === activeId);
        const overIndex = toCards.findIndex((c) => c.id === overId);

        if (fromIndex === -1) return;

        const [moved] = fromCards.splice(fromIndex, 1);
        // 更新被拖卡片的 categoryId
        const updatedMoved: Card = {...moved, categoryId: overLoc.categoryId};

        const insertIndex = overIndex === -1 ? toCards.length : overIndex;
        toCards.splice(insertIndex, 0, updatedMoved);

        // 更新本地状态
        if (activeLoc.categoryId === null) {
          setLocalUnclassified(fromCards);
        } else {
          setLocalCategories((prev) =>
            prev.map((c) =>
              c.id === activeLoc.categoryId ? {...c, cards: fromCards} : c
            )
          );
        }

        if (overLoc.categoryId === null) {
          setLocalUnclassified(toCards);
        } else {
          setLocalCategories((prev) =>
            prev.map((c) =>
              c.id === overLoc.categoryId ? {...c, cards: toCards} : c
            )
          );
        }

        // 持久化：两个分类都要更新
        void persistReorder(
          fromCards.map((c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: activeLoc.categoryId,
          }))
        );
        void persistReorder(
          toCards.map((c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: overLoc.categoryId,
          }))
        );
      }
    },
    [localCategories, localUnclassified]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {hasCards ? (
        <div>
          {/* 新建卡片按钮 */}
          <div className="flex justify-end mb-4">
            <Button
              label="新建卡片"
              variant="primary"
              icon={<Plus size={16} />}
              onClick={handleNewCard}
            />
          </div>

          {/* 分类分区纵向铺开（启用拖拽） */}
          {localCategories.map((category) => (
            <CategorySection
              key={category.id}
              title={category.name}
              cards={category.cards ?? []}
              statuses={statuses}
              networkMode={networkMode}
              onCardClick={refreshOne}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              sortable
            />
          ))}

          {/* 未分类排在最后 */}
          {localUnclassified.length > 0 && (
            <CategorySection
              title={null}
              cards={localUnclassified}
              statuses={statuses}
              networkMode={networkMode}
              onCardClick={refreshOne}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              sortable
            />
          )}
        </div>
      ) : (
        <EmptyState
          title="还没有任何卡片"
          description="创建第一张卡片来开始管理你的导航"
          icon={<Plus size={32} />}
          actions={
            <Button
              label="创建卡片"
              variant="primary"
              icon={<Plus size={16} />}
              onClick={handleNewCard}
            />
          }
        />
      )}

      <CardEditModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        card={editingCard}
        categories={categories}
        onSaved={() => window.location.reload()}
      />

      {/* 拖拽预览：跟随光标移动的卡片镜像 */}
      <DragOverlay dropAnimation={{duration: 200, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)'}}>
        {activeCard ? (
          <div className="opacity-90 scale-105 shadow-lg rounded-xl pointer-events-none ring-2 ring-accent/40">
            <CardItem
              card={activeCard}
              status={statuses[activeCard.id]}
              href={getCardUrl(activeCard, networkMode)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
