import { AppShell } from '@astryxdesign/core/AppShell';
import { VStack } from '@astryxdesign/core/VStack';
import { BackgroundLayer } from '@/components/layout/BackgroundLayer';
import { FloatingLogo } from '@/components/layout/FloatingLogo';
import { FloatingToolbar } from '@/components/layout/FloatingToolbar';
import { HomeContent } from '@/components/layout/HomeContent';
import { WidgetBar } from '@/components/layout/WidgetBar';
import { SearchBox } from '@/components/search/SearchBox';
import { prisma } from '@/lib/db';
import { getUserPreference } from '@/lib/preferences';
import { getWallpaperPreferences, getWallpapers } from '@/lib/wallpaper';
import type {
  Card,
  CardLuckyState,
  Category,
  NetworkMode,
  SearchEngine,
  WidgetKey,
  WidgetLayout,
} from '@/types';

/**
 * 主页（服务端取数）
 *
 * 结构：
 * - 左上：FloatingLogo（fixed）
 * - 右上：FloatingToolbar（fixed floating pill）
 * - 主体容器：max-w-1440px 居中
 *   - 搜索框：独立居中，距顶部约 160px（pt-40）
 *   - 主体分栏：分类分区（flex-1） + 右侧 widget 栏（360px）
 */
export default async function HomePage() {
  // 并行获取所有独立数据（无依赖关系，Promise.all 减少总等待时间）
  const [
    categories,
    unclassifiedCards,
    networkMode,
    searchEngine,
    widgetConfigs,
    widgetLayout,
    wallpapers,
    wallpaperPreferences,
  ] = await Promise.all([
    // 取所有分类（含卡片），按 order 排序
    prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: { cards: { orderBy: { order: 'asc' } } },
    }),
    // 取未分类卡片
    prisma.card.findMany({
      where: { categoryId: null },
      orderBy: { order: 'asc' },
    }),
    // 网络模式（供 NetworkToggle 初始值，避免客户端闪烁）
    getUserPreference<NetworkMode>('networkMode', 'auto'),
    // 搜索引擎（供 SearchBox 初始值，避免客户端闪烁）
    getUserPreference<SearchEngine>('searchEngine', 'google'),
    // widget 栏配置（SSR 初始值，避免客户端闪烁）
    prisma.widgetConfig.findMany({ orderBy: { order: 'asc' } }),
    // widget 栏数
    getUserPreference<WidgetLayout>('widgetLayout', 1),
    // 壁纸列表 + 偏好（SSR 初始值，客户端根据当前主题选择显示）
    getWallpapers(),
    getWallpaperPreferences(),
  ]);

  const initialConfigs = widgetConfigs.map((c) => ({
    widgetKey: c.widgetKey as WidgetKey,
    enabled: c.enabled,
    order: c.order,
  }));

  // 序列化日期为字符串（Prisma Date → JSON 友好，Category 无 createdAt/updatedAt）
  // lucky 字段：Prisma 返回 JsonValue，断言为 CardLuckyState（结构由 service 层保证）
  const serializedCategories: Category[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    order: c.order,
    cards: c.cards.map((card) => ({
      ...card,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
      lucky: card.lucky as CardLuckyState | null,
    })),
  }));

  const serializedUnclassified: Card[] = unclassifiedCards.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    lucky: c.lucky as CardLuckyState | null,
  }));

  return (
    <>
      <BackgroundLayer
        wallpapers={wallpapers}
        preferences={wallpaperPreferences}
      />
      <AppShell
        contentPadding={4}
        height="fill"
        // 背景透明：StyleX 的 x1eiddq6 类设置了不透明 background-body 色，
        // 用 inline style 覆盖让 BackgroundLayer 透出来
        style={{ backgroundColor: 'transparent' }}
      >
        <FloatingLogo />
        <FloatingToolbar networkMode={networkMode} />

        <VStack gap={8} className="mx-auto w-full max-w-[1440px] pt-40">
          <SearchBox initialEngine={searchEngine} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <HomeContent
              categories={serializedCategories}
              unclassifiedCards={serializedUnclassified}
              networkMode={networkMode}
            />
            <aside className="w-full lg:w-[360px] lg:sticky lg:top-28 lg:self-start order-2 lg:order-none">
              <WidgetBar
                initialConfigs={initialConfigs}
                initialLayout={widgetLayout}
              />
            </aside>
          </div>
        </VStack>
      </AppShell>
    </>
  );
}
