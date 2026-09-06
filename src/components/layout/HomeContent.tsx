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
import { BatchDeleteBar } from '@/components/layout/BatchDeleteBar';
import {
  CARD_SIMPLE_MODE_EVENT,
  CARD_STATUS_BADGE_EVENT,
} from '@/components/layout/card-view-events';
import { EDIT_MODE_CHANGE_EVENT } from '@/components/layout/edit-mode-event';
import { useBatchDeleteCards } from '@/hooks/useBatchDeleteCards';
import { useCardReorder } from '@/hooks/useCardReorder';
import { useCardStatuses } from '@/hooks/useCardStatuses';
import { useExternalDrop } from '@/hooks/useExternalDrop';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { cardsApi } from '@/services/cards';
import type { Card, Category, NetworkMode } from '@/types';

interface HomeContentProps {
  categories: Category[];
  unclassifiedCards: Card[];
  networkMode: NetworkMode;
  /** 卡片简洁模式（SSR 初始值） */
  cardSimpleMode: boolean;
  /** 卡片状态徽章显隐（SSR 初始值） */
  cardStatusBadge: boolean;
}

/**
 * 主页内容区
 *
 * - 有卡片时：分类分区纵向铺开 + 未分类排最后 + DndContext 跨分类拖拽
 * - 空状态：EmptyState 引导
 * - 批量删除的状态与动作在 useBatchDeleteCards，操作条在 BatchDeleteBar
 */
export function HomeContent({
  categories,
  unclassifiedCards,
  networkMode,
  cardSimpleMode,
  cardStatusBadge,
}: HomeContentProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  // 新建卡片时预填的分类 ID（null = 未分类；undefined = 未指定，由 Modal 默认未分类）
  const [initialCategoryId, setInitialCategoryId] = useState<
    string | null | undefined
  >(undefined);
  const [initialUrl, setInitialUrl] = useState<string | undefined>(undefined);
  const [dropKey, setDropKey] = useState(0);
  const [reorderMode, setReorderMode] = useState(false);
  // 卡片简洁模式（FloatingToolbar 切换，事件同步；SSR 初始值避免闪烁）
  const [simpleMode, setSimpleMode] = useState(cardSimpleMode);
  // 卡片状态徽章显隐（FloatingToolbar 切换，事件同步；SSR 初始值避免闪烁）
  const [showStatusBadge, setShowStatusBadge] = useState(cardStatusBadge);
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

  // 卡片简洁模式开关（FloatingToolbar 切换后即时生效）
  useEffect(() => {
    const handler = (e: Event) => {
      setSimpleMode((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener(CARD_SIMPLE_MODE_EVENT, handler);
    return () => window.removeEventListener(CARD_SIMPLE_MODE_EVENT, handler);
  }, []);

  // 卡片状态徽章显隐开关（FloatingToolbar 切换后即时生效）
  useEffect(() => {
    const handler = (e: Event) => {
      setShowStatusBadge((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener(CARD_STATUS_BADGE_EVENT, handler);
    return () => window.removeEventListener(CARD_STATUS_BADGE_EVENT, handler);
  }, []);

  const { scheduleDelete } = useUndoableDelete();

  const hasCards =
    localCategories.some((c) => c.cards && c.cards.length > 0) ||
    localUnclassified.length > 0;

  // 全部卡片 id（批量删除「全选」用）
  const allCardIds = [
    ...localCategories.flatMap((c) => c.cards ?? []),
    ...localUnclassified,
  ].map((c) => c.id);
  const batch = useBatchDeleteCards(allCardIds);

  /** 拖入链接 → 打开新建弹框并预填 URL */
  const handleDropUrl = (url: string) => {
    setEditingCard(null);
    setInitialCategoryId(undefined);
    setInitialUrl(url);
    setDropKey((k) => k + 1);
    setModalOpen(true);
  };
  const { isDragOver } = useExternalDrop({ onDropUrl: handleDropUrl });

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
    setInitialUrl(undefined);
    setModalOpen(true);
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setInitialCategoryId(undefined);
    setInitialUrl(undefined);
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
          {/* 分类分区纵向铺开，保持所有分区共用同一条左边界（启用拖拽）
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
              simple={simpleMode}
              showStatus={showStatusBadge}
              selectionMode={batch.active}
              selectedIds={batch.selectedIds}
              onToggleSelect={batch.toggle}
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
              simple={simpleMode}
              showStatus={showStatusBadge}
              selectionMode={batch.active}
              selectedIds={batch.selectedIds}
              onToggleSelect={batch.toggle}
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
        key={dropKey}
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
        initialUrl={initialUrl}
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
              simple={simpleMode}
              showStatus={showStatusBadge}
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* 批量删除底部操作条 + 确认弹框 */}
      {batch.active && (
        <BatchDeleteBar
          selectedCount={batch.selectedIds.size}
          totalCount={allCardIds.length}
          deleting={batch.deleting}
          onToggleAll={batch.toggleAll}
          onConfirmDelete={batch.confirmDelete}
          onCancel={batch.exit}
        />
      )}

      {/* 拖入链接时的全屏放置提示层 */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-accent/10 backdrop-blur-sm"
          style={{ pointerEvents: 'none' }}
        >
          <div className="rounded-2xl border-2 border-dashed border-accent bg-surface/90 px-8 py-6 shadow-lg">
            <p className="text-sm font-medium text-accent">松开以添加卡片</p>
          </div>
        </div>
      )}
    </DndContext>
  );
}
