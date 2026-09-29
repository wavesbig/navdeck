/**
 * 分类分区 droppable 的 id 契约（跨文件共享的唯一出处）
 *
 * dnd-kit 体系中分类分区作为跨分类拖拽的落点，id 形如 `category:<id>`
 * （未分类为 `category:null`）。此前该前缀在 SortableCardGrid（注册）、
 * useCardReorder（解析落点）、HomeContent（碰撞过滤）三处硬编码。
 */

const CATEGORY_DROPPABLE_PREFIX = 'category:';

/** 分类分区 droppable id（null = 未分类） */
export function categoryDroppableId(categoryId: string | null): string {
  return `${CATEGORY_DROPPABLE_PREFIX}${categoryId ?? 'null'}`;
}

/** 判断 dnd id 是否为分类分区 droppable */
export function isCategoryDroppableId(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith(CATEGORY_DROPPABLE_PREFIX);
}

/** 从分类分区 droppable id 解析分类 id（null = 未分类） */
export function parseCategoryDroppableId(id: string): string | null {
  return id === `${CATEGORY_DROPPABLE_PREFIX}null`
    ? null
    : id.slice(CATEGORY_DROPPABLE_PREFIX.length);
}
