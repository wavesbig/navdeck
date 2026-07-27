import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { CategoryManager } from '@/components/settings/CategoryManager';
import { prisma } from '@/lib/db';
import type { Category } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 分类管理页
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

  // 转换为前端类型（cards 只取 length，不需要完整数据）
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
    <VStack gap={4}>
      <Heading level={4}>分类管理</Heading>
      <Text size="sm" color="secondary">
        管理卡片分类，拖拽手柄调整顺序
      </Text>
      <CategoryManager initialCategories={initialCategories} />
    </VStack>
  );
}
