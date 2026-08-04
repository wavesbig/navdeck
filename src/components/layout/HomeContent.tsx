'use client';

import { Button } from '@astryxdesign/core/Button';
import { DialogHeader, useImperativeDialog } from '@astryxdesign/core/Dialog';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { closestCorners, DndContext, DragOverlay } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CardEditModal } from '@/components/cards/CardEditModal';
import { CardItem } from '@/components/cards/CardItem';
import { getCardUrl } from '@/components/cards/card-url';
import { CategorySection } from '@/components/categories/CategorySection';
import { useCardReorder } from '@/hooks/useCardReorder';
import { useCardStatuses } from '@/hooks/useCardStatuses';
import { cardsApi } from '@/services/cards';
import type { Card, Category, NetworkMode } from '@/types';

/** 全局事件名：FloatingToolbar 与 HomeContent 之间切换排序模式 */
const REORDER_TOGGLE_EVENT = 'reorder-mode-toggle';

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
  const confirmDialog = useImperativeDialog();
  const showToast = useToast();
  const router = useRouter();

  const {
    localCategories,
    localUnclassified,
    activeCard,
    sensors,
    handleDragStart,
    handleDragEnd,
  } = useCardReorder(categories, unclassifiedCards);

  // 状态灯批量探测 + 网络模式切换重探测
  const { statuses, refreshOne } = useCardStatuses();

  // 监听 FloatingToolbar 的排序模式切换事件
  useEffect(() => {
    const handler = () => setReorderMode((prev) => !prev);
    window.addEventListener(REORDER_TOGGLE_EVENT, handler);
    return () => window.removeEventListener(REORDER_TOGGLE_EVENT, handler);
  }, []);

  // ESC 退出排序模式：dispatch 事件让 FloatingToolbar 同步切换
  useEffect(() => {
    if (!reorderMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent(REORDER_TOGGLE_EVENT));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reorderMode]);

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

  const handleDeleteCard = async (card: Card) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      confirmDialog.show(
        <VStack gap={4}>
          <DialogHeader
            title="删除卡片"
            onOpenChange={(o) => !o && resolve(false)}
          />
          <Text>{`确认删除「${card.name}」吗？`}</Text>
          <HStack gap={2} justify="end">
            <Button
              label="取消"
              variant="ghost"
              onClick={() => {
                confirmDialog.hide();
                resolve(false);
              }}
            />
            <Button
              label="删除"
              variant="destructive"
              onClick={() => {
                confirmDialog.hide();
                resolve(true);
              }}
            />
          </HStack>
        </VStack>,
        { purpose: 'required', width: 420 },
      );
    });
    if (!confirmed) return;

    try {
      await cardsApi.delete(card.id);
      router.refresh();
    } catch {
      showToast({ body: '删除失败', type: 'error' });
    }
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
        onSaved={() => router.refresh()}
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
      {confirmDialog.element}
    </DndContext>
  );
}
