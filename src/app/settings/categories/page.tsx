import { VStack } from '@astryxdesign/core/VStack';
import { CategoryManager } from '@/components/settings/CategoryManager';
import { prisma } from '@/lib/db';
import type { Category } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 分类管理页
 *
 * Linear / Vercel 风格：Card 容器
 * - 顶部操作行：section header + 新建按钮
 * - 下方 DnD 列表，编辑走 Dialog
 */
export default async function CategoriesSettingsPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      cards: {
        orderBy: { order: 'asc' },
        select: { id: true },
      },
    },
  });

  const initialCategories: Category[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    order: c.order,
    cards: c.cards.map((card) => ({
      id: card.id,
      name: '',
      internalUrl: '',
      externalUrl: '',
      icon: '',
      description: null,
      categoryId: c.id,
      order: 0,
      createdAt: '',
      updatedAt: '',
    })),
  }));

  return (
    <VStack gap={4} className="max-w-[640px]">
      <CategoryManager initialCategories={initialCategories} />
    </VStack>
  );
}
