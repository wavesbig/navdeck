'use client';

import {
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect, useState } from 'react';
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

/** 调用 reorder API 持久化，返回是否成功 */
async function persistReorder(items: CardReorderItem[]): Promise<boolean> {
  try {
    await cardsApi.reorder(items);
    return true;
  } catch (e) {
    console.error('reorder failed', e);
    return false;
  }
}

interface UseCardReorderResult {
  localCategories: Category[];
  localUnclassified: Card[];
  activeCard: Card | null;
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  /** 乐观移除卡片（仅 UI），返回被移除的卡片用于撤销 */
  removeCardOptimistic: (cardId: string) => Card | null;
  /** 恢复被乐观移除的卡片到原分类 */
  restoreCard: (card: Card) => void;
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
  // 本地副本：拖拽时乐观更新（立即响应 + 异步 persist），prop 变化时同步
  // 不能用 useMemo：拖拽 mutation 需要写入本地临时状态，useMemo 只能派生不能修改
  const [localCategories, setLocalCategories] =
    useState<Category[]>(categories);
  const [localUnclassified, setLocalUnclassified] =
    useState<Card[]>(unclassifiedCards);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // prop 变化时同步本地状态（如 SWR 重新验证返回新数据时）
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);
  useEffect(() => {
    setLocalUnclassified(unclassifiedCards);
  }, [unclassifiedCards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

    if (!activeLoc) return;

    // over 是分类区域 droppable（`category:<id>`）：跨分类拖到空白区域，
    // 把卡片放到目标分类末尾
    if (typeof overId === 'string' && overId.startsWith('category:')) {
      const targetCategoryId =
        overId === 'category:null' ? null : overId.slice('category:'.length);

      // 同分类拖到自身区域：忽略
      if (activeLoc.categoryId === targetCategoryId) return;

      const fromCards =
        activeLoc.categoryId === null
          ? [...localUnclassified]
          : [
              ...(localCategories.find((c) => c.id === activeLoc.categoryId)
                ?.cards ?? []),
            ];
      const toCards =
        targetCategoryId === null
          ? [...localUnclassified]
          : [
              ...(localCategories.find((c) => c.id === targetCategoryId)
                ?.cards ?? []),
            ];

      const fromIndex = fromCards.findIndex((c) => c.id === activeId);
      if (fromIndex === -1) return;

      const [moved] = fromCards.splice(fromIndex, 1);
      const updatedMoved: Card = { ...moved, categoryId: targetCategoryId };
      toCards.push(updatedMoved);

      if (activeLoc.categoryId === null) {
        setLocalUnclassified(fromCards);
      } else {
        setLocalCategories((prev) =>
          prev.map((c) =>
            c.id === activeLoc.categoryId ? { ...c, cards: fromCards } : c,
          ),
        );
      }

      if (targetCategoryId === null) {
        setLocalUnclassified(toCards);
      } else {
        setLocalCategories((prev) =>
          prev.map((c) =>
            c.id === targetCategoryId ? { ...c, cards: toCards } : c,
          ),
        );
      }

      // 合并 from + to 为一次 API 调用（避免并发 persist 导致顺序不一致）
      const allItems: CardReorderItem[] = [
        ...fromCards.map(
          (c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: activeLoc.categoryId,
          }),
        ),
        ...toCards.map(
          (c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: targetCategoryId,
          }),
        ),
      ];
      void persistReorder(allItems).then((ok) => {
        if (!ok) {
          // 持久化失败：回滚到 prop 原始状态
          setLocalCategories(categories);
          setLocalUnclassified(unclassifiedCards);
        }
      });
      return;
    }

    const overLoc = locateCard(overId, localCategories, localUnclassified);

    if (!overLoc) return;

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
      ).then((ok) => {
        if (!ok) {
          // 持久化失败：回滚到 prop 原始状态
          setLocalCategories(categories);
          setLocalUnclassified(unclassifiedCards);
        }
      });
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

      // 判断鼠标在 over 卡片左半还是右半，决定前/后插入
      // 右半部分 → 插入到 over 卡片后面；左半部分 → 插入到 over 卡片前面
      const overRect = over.rect;
      const activeRect = active.rect.current.translated;
      const activeCenterX = activeRect
        ? activeRect.left + activeRect.width / 2
        : 0;
      const overCenterX = overRect ? overRect.left + overRect.width / 2 : 0;
      const insertAfter = activeCenterX > overCenterX;
      const insertIndex =
        overIndex === -1
          ? toCards.length
          : insertAfter
            ? overIndex + 1
            : overIndex;
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

      // 合并 from + to 为一次 API 调用（避免并发 persist 导致顺序不一致）
      const crossItems: CardReorderItem[] = [
        ...fromCards.map(
          (c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: activeLoc.categoryId,
          }),
        ),
        ...toCards.map(
          (c, i): CardReorderItem => ({
            id: c.id,
            order: i,
            categoryId: overLoc.categoryId,
          }),
        ),
      ];
      void persistReorder(crossItems).then((ok) => {
        if (!ok) {
          // 持久化失败：回滚到 prop 原始状态
          setLocalCategories(categories);
          setLocalUnclassified(unclassifiedCards);
        }
      });
    }
  };

  /** 乐观移除卡片（仅 UI 不持久化），返回被移除的卡片用于撤销恢复 */
  const removeCardOptimistic = useCallback(
    (cardId: string): Card | null => {
      const card = findCardById(cardId, localCategories, localUnclassified);
      if (!card) return null;
      setLocalCategories((prev) =>
        prev.map((c) => ({
          ...c,
          cards: c.cards?.filter((card) => card.id !== cardId) ?? [],
        })),
      );
      setLocalUnclassified((prev) => prev.filter((c) => c.id !== cardId));
      return card;
    },
    [localCategories, localUnclassified],
  );

  /** 恢复被乐观移除的卡片到原分类末尾 */
  const restoreCard = useCallback((card: Card) => {
    if (card.categoryId === null) {
      setLocalUnclassified((prev) => [...prev, card]);
    } else {
      setLocalCategories((prev) =>
        prev.map((c) =>
          c.id === card.categoryId
            ? { ...c, cards: [...(c.cards ?? []), card] }
            : c,
        ),
      );
    }
  }, []);

  return {
    localCategories,
    localUnclassified,
    activeCard,
    sensors,
    handleDragStart,
    handleDragEnd,
    removeCardOptimistic,
    restoreCard,
  };
}
