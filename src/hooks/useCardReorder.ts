'use client';

import {
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { cardsApi } from '@/services/cards';
import type { Card, CardReorderItem, Category } from '@/types';

/** 找到卡片所在分组（categoryId 为 null 表示未分类） */
function locateCard(
  cardId: string,
  categories: Category[],
  unclassified: Card[],
): { categoryId: string | null } | null {
  for (const cat of categories) {
    if (cat.cards?.some((c) => c.id === cardId)) {
      return { categoryId: cat.id };
    }
  }
  if (unclassified.some((c) => c.id === cardId)) {
    return { categoryId: null };
  }
  return null;
}

/** 按 id 查找卡片 */
function findCardById(
  cardId: string,
  categories: Category[],
  unclassified: Card[],
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
    await cardsApi.reorder(items);
  } catch (e) {
    console.error('reorder failed', e);
  }
}

interface UseCardReorderResult {
  localCategories: Category[];
  localUnclassified: Card[];
  activeCard: Card | null;
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

/**
 * 卡片拖拽排序 hook
 *
 * - 维护本地分类/未分类状态，prop 变化时通过 effect 同步
 * - 同分类内排序 + 跨分类拖拽（含 categoryId 更新）
 * - 乐观更新本地 state，异步 persistReorder 持久化
 */
export function useCardReorder(
  categories: Category[],
  unclassifiedCards: Card[],
): UseCardReorderResult {
  const [localCategories, setLocalCategories] =
    useState<Category[]>(categories);
  const [localUnclassified, setLocalUnclassified] =
    useState<Card[]>(unclassifiedCards);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // prop 变化时同步本地状态，避免 useState 派生导致的 stale 值
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);
  useEffect(() => {
    setLocalUnclassified(unclassifiedCards);
  }, [unclassifiedCards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const card = findCardById(id, localCategories, localUnclassified);
    setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeLoc = locateCard(activeId, localCategories, localUnclassified);
    const overLoc = locateCard(overId, localCategories, localUnclassified);

    if (!activeLoc || !overLoc) return;

    if (activeLoc.categoryId === overLoc.categoryId) {
      // 同分类内排序
      const cards =
        activeLoc.categoryId === null
          ? [...localUnclassified]
          : [
              ...(localCategories.find((c) => c.id === activeLoc.categoryId)
                ?.cards ?? []),
            ];

      const oldIndex = cards.findIndex((c) => c.id === activeId);
      const newIndex = cards.findIndex((c) => c.id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const [moved] = cards.splice(oldIndex, 1);
      cards.splice(newIndex, 0, moved);

      if (activeLoc.categoryId === null) {
        setLocalUnclassified(cards);
      } else {
        setLocalCategories((prev) =>
          prev.map((c) =>
            c.id === activeLoc.categoryId ? { ...c, cards } : c,
          ),
        );
      }

      void persistReorder(
        cards.map(
          (c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: activeLoc.categoryId,
          }),
        ),
      );
    } else {
      // 跨分类拖拽：从 activeLoc 移到 overLoc
      const fromCards =
        activeLoc.categoryId === null
          ? [...localUnclassified]
          : [
              ...(localCategories.find((c) => c.id === activeLoc.categoryId)
                ?.cards ?? []),
            ];
      const toCards =
        overLoc.categoryId === null
          ? [...localUnclassified]
          : [
              ...(localCategories.find((c) => c.id === overLoc.categoryId)
                ?.cards ?? []),
            ];

      const fromIndex = fromCards.findIndex((c) => c.id === activeId);
      const overIndex = toCards.findIndex((c) => c.id === overId);

      if (fromIndex === -1) return;

      const [moved] = fromCards.splice(fromIndex, 1);
      const updatedMoved: Card = { ...moved, categoryId: overLoc.categoryId };

      const insertIndex = overIndex === -1 ? toCards.length : overIndex;
      toCards.splice(insertIndex, 0, updatedMoved);

      if (activeLoc.categoryId === null) {
        setLocalUnclassified(fromCards);
      } else {
        setLocalCategories((prev) =>
          prev.map((c) =>
            c.id === activeLoc.categoryId ? { ...c, cards: fromCards } : c,
          ),
        );
      }

      if (overLoc.categoryId === null) {
        setLocalUnclassified(toCards);
      } else {
        setLocalCategories((prev) =>
          prev.map((c) =>
            c.id === overLoc.categoryId ? { ...c, cards: toCards } : c,
          ),
        );
      }

      void persistReorder(
        fromCards.map(
          (c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: activeLoc.categoryId,
          }),
        ),
      );
      void persistReorder(
        toCards.map(
          (c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: overLoc.categoryId,
          }),
        ),
      );
    }
  };

  return {
    localCategories,
    localUnclassified,
    activeCard,
    sensors,
    handleDragStart,
    handleDragEnd,
  };
}
