import {AppShell} from '@astryxdesign/core/AppShell';
import {VStack} from '@astryxdesign/core/VStack';
import {FloatingLogo} from '@/components/layout/FloatingLogo';
import {FloatingToolbar} from '@/components/layout/FloatingToolbar';
import {SearchBox} from '@/components/search/SearchBox';
import {HomeContent} from '@/components/layout/HomeContent';
import {WidgetBar} from '@/components/layout/WidgetBar';
import {prisma} from '@/lib/db';
import {getUserPreference} from '@/lib/preferences';
import type {Card, NetworkMode} from '@/types';

/**
 * 主页（服务端取数）
 *
 * 结构：
 * - 左上：FloatingLogo（fixed）
 * - 右上：FloatingToolbar（fixed floating pill）
 * - 主体容器：max-w-1440px 居中
 *   - 搜索框：独立居中，距顶部约 80px
 *   - 主体分栏：分类分区（flex-1） + 右侧 widget 栏（360px）
 */
export default async function HomePage() {
  // 取所有分类（含卡片），按 order 排序
  const categories = await prisma.category.findMany({
    orderBy: {order: 'asc'},
    include: {
      cards: {
        orderBy: {order: 'asc'},
      },
    },
  });

  // 取未分类卡片
  const unclassifiedCards = await prisma.card.findMany({
    where: {categoryId: null},
    orderBy: {order: 'asc'},
  });

  // 读取网络模式（供 NetworkToggle 初始值，避免客户端闪烁）
  const networkMode = await getUserPreference<NetworkMode>('networkMode', 'auto');

  // 序列化日期为字符串（Prisma Date → JSON 友好，Category 无 createdAt/updatedAt）
  const serializedCategories = categories.map((c) => ({
    ...c,
    cards: c.cards.map((card) => ({
      ...card,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    })),
  }));

  const serializedUnclassified: Card[] = unclassifiedCards.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <AppShell contentPadding={4} height="fill">
      <FloatingLogo />
      <FloatingToolbar networkMode={networkMode} />

      <VStack gap={4} className="mx-auto w-full max-w-[1440px] pt-20">
        <SearchBox />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <HomeContent
            categories={serializedCategories}
            unclassifiedCards={serializedUnclassified}
            networkMode={networkMode}
          />
          <aside className="lg:sticky lg:top-28 lg:self-start order-2 lg:order-none">
            <WidgetBar />
          </aside>
        </div>
      </VStack>
    </AppShell>
  );
}
