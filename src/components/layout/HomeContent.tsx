'use client';

import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useToast } from '@astryxdesign/core/Toast';
import { closestCorners, DndContext, DragOverlay } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CardEditModal } from '@/components/cards/CardEditModal';
import { CardItem } from '@/components/cards/CardItem';
import { getCardUrl } from '@/components/cards/card-url';
import { CategorySection } from '@/components/categories/CategorySection';
import { EDIT_MODE_CHANGE_EVENT } from '@/components/layout/FloatingToolbar';
import { useCardReorder } from '@/hooks/useCardReorder';
import { useCardStatuses } from '@/hooks/useCardStatuses';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { cardsApi } from '@/services/cards';
import type { Card, Category, NetworkMode } from '@/types';

interface HomeContentProps {
  categories: Category[];
  unclassifiedCards: Card[];
  networkMode: NetworkMode;
}

/**
 * 主页内容区
 *
 * - 有卡片时：分类分区纵向铺开 + 未分类排最后 + DndContext 跨分类拖拽
 * - 空状态：EmptyState 引导
 */
export function HomeContent({
  categories,
  unclassifiedCards,
  networkMode,
}: HomeContentProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  // 新建卡片时预填的分类 ID（null = 未分类；undefined = 未指定，由 Modal 默认未分类）
  const [initialCategoryId, setInitialCategoryId] = useState<
    string | null | undefined
  >(undefined);
  const [reorderMode, setReorderMode] = useState(false);
  const showToast = useToast();
  const router = useRouter();

  const {
    localCategories,
    localUnclassified,
    activeCard,
    sensors,
    handleDragStart,
    handleDragEnd,
    removeCardOptimistic,
    restoreCard,
  } = useCardReorder(categories, unclassifiedCards);

  // 状态灯批量探测 + 网络模式切换重探测
  const { statuses, refreshOne } = useCardStatuses();

  // 监听 FloatingToolbar 统一编辑模式开关（同时管控卡片排序态 + widget 编辑态）
  // ESC 退出由 FloatingToolbar 统一处理，此处只同步状态
  useEffect(() => {
    const handler = (e: Event) => {
      const value = (e as CustomEvent<boolean>).detail;
      setReorderMode(value);
    };
    window.addEventListener(EDIT_MODE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(EDIT_MODE_CHANGE_EVENT, handler);
  }, []);

  const { scheduleDelete } = useUndoableDelete();

  const hasCards =
    localCategories.some((c) => c.cards && c.cards.length > 0) ||
    localUnclassified.length > 0;

  /**
   * 新建卡片入口
   *
   * 设计意图：把入口贴近它要加入的容器（分类末尾的 dashed 占位卡片），
   * 而不是孤立的全局按钮。categoryId 闭包绑定意图：
   *   - 点击某分类末尾的 "+" → 加到该分类
   *   - 点击未分类末尾的 "+" → 加到未分类
   *   - EmptyState 的"创建卡片" → 不预填（默认未分类）
   */
  const handleNewCard = (categoryId: string | null) => {
    setEditingCard(null);
    setInitialCategoryId(categoryId);
    setModalOpen(true);
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setInitialCategoryId(undefined);
    setModalOpen(true);
  };

  // 删除走 toast 撤销（规范 §4）：乐观移除 → 5 秒内可撤销 → 超时持久化
  const handleDeleteCard = (card: Card) => {
    const removed = removeCardOptimistic(card.id);
    if (!removed) return;

    scheduleDelete({
      label: card.name,
      onUndo: () => {
        restoreCard(card);
        router.refresh();
      },
      onConfirm: async () => {
        try {
          await cardsApi.delete(card.id);
          router.refresh();
        } catch {
          showToast({ body: '删除失败', type: 'error' });
          restoreCard(card);
        }
      },
    });
  };

  return (
    <DndContext
      // sensors 始终保持稳定引用（避免 dnd-kit useEffect 依赖数组长度变化告警）。
      // 非排序模式下，SortableCardItem 的 useSortable disabled=true 且不绑定
      // listeners，sensors 收到指针事件也不会触发拖拽。
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {hasCards ? (
        <div>
          {/* 分类分区纵向铺开（启用拖拽）
           * 排序模式下分类标题右侧的新建按钮会被隐藏，避免误触。 */}
          {localCategories.map((category) => (
            <CategorySection
              key={category.id}
              title={category.name}
              icon={category.icon}
              color={category.color}
              categoryId={category.id}
              cards={category.cards ?? []}
              statuses={statuses}
              networkMode={networkMode}
              onCardClick={refreshOne}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              onAddCard={() => handleNewCard(category.id)}
              sortable
              reorderMode={reorderMode}
              activeCard={activeCard}
            />
          ))}

          {/* 未分类排在最后 */}
          {localUnclassified.length > 0 && (
            <CategorySection
              title={null}
              categoryId={null}
              cards={localUnclassified}
              statuses={statuses}
              networkMode={networkMode}
              onCardClick={refreshOne}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              onAddCard={() => handleNewCard(null)}
              sortable
              reorderMode={reorderMode}
              activeCard={activeCard}
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
              onClick={() => handleNewCard(null)}
            />
          }
        />
      )}

      <CardEditModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        card={editingCard}
        categories={categories}
        onSaved={() => {
          showToast({
            body: editingCard ? '卡片修改已保存' : '卡片已创建',
            type: 'info',
          });
          router.refresh();
        }}
        initialCategoryId={initialCategoryId}
      />

      {/* 拖拽预览：跟随光标移动的卡片镜像 */}
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        {activeCard ? (
          <div className="pointer-events-none">
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
