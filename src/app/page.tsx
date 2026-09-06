import { AppShell } from '@astryxdesign/core/AppShell';
import { VStack } from '@astryxdesign/core/VStack';
import { BackgroundLayer } from '@/components/layout/BackgroundLayer';
import { EditModeBanner } from '@/components/layout/EditModeBanner';
import { FloatingLogo } from '@/components/layout/FloatingLogo';
import { FloatingToolbar } from '@/components/layout/FloatingToolbar';
import { HomeClock } from '@/components/layout/HomeClock';
import { HomeContent } from '@/components/layout/HomeContent';
import { WidgetBar } from '@/components/layout/WidgetBar';
import { SearchBox } from '@/components/search/SearchBox';
import { getBrandConfig } from '@/lib/brand';
import { prisma } from '@/lib/db';
import { getUserPreference } from '@/lib/preferences';
import { listSearchEngines } from '@/lib/search-engines';
import { getWallpaperPreferences, getWallpapers } from '@/lib/wallpaper';
import type {
  Card,
  CardLuckyState,
  Category,
  NetworkMode,
  SearchEngine,
  WidgetKey,
} from '@/types';

/**
 * 主页（服务端取数）
 *
 * 结构：
 * - 左上：FloatingLogo（fixed）
 * - 右上：FloatingToolbar（fixed floating pill）
 * - 主体容器：max-w-1360px 居中
 *   - 首屏三段：居中时钟/搜索、widget 横条、图标分类区
 *   - 搜索保持独立焦点，widget 以等宽横条承载状态信息
 */
export default async function HomePage() {
  // 并行获取所有独立数据（无依赖关系，Promise.all 减少总等待时间）
  const [
    categories,
    unclassifiedCards,
    networkMode,
    searchEngine,
    widgetInstances,
    wallpapers,
    wallpaperPreferences,
    brand,
    engines,
    cardSimpleMode,
    cardStatusBadge,
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
    // widget 实例（SSR 初始值，避免客户端闪烁）
    prisma.widgetInstance.findMany({ orderBy: { order: 'asc' } }),
    // 壁纸列表 + 偏好（SSR 初始值，客户端根据当前主题选择显示）
    getWallpapers(),
    getWallpaperPreferences(),
    getBrandConfig(),
    // 合并引擎列表（内置 + 自定义，SSR 传入避免客户端闪烁）
    listSearchEngines(),
    // 卡片简洁模式（SSR 初始值，避免客户端闪烁）
    getUserPreference<boolean>('cardSimpleMode', false),
    // 卡片状态徽章显隐（SSR 初始值，避免客户端闪烁）
    getUserPreference<boolean>('cardStatusBadge', true),
  ]);

  const initialInstances = widgetInstances.map((i) => ({
    id: i.id,
    widgetKey: i.widgetKey as WidgetKey,
    order: i.order,
    size: i.size as 'S' | 'M' | 'L',
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
        <FloatingLogo brand={brand} />
        <FloatingToolbar
          networkMode={networkMode}
          cardSimpleMode={cardSimpleMode}
        />
        <EditModeBanner />

        {/* 首屏分三段：时钟/搜索聚焦入口、widget 状态横条、图标内容区。 */}
        <VStack gap={10} className="mx-auto w-full max-w-[1360px] pt-28">
          <VStack gap={4} className="mx-auto w-full max-w-[720px]">
            <HomeClock />
            <SearchBox initialEngine={searchEngine} engines={engines} />
          </VStack>

          <WidgetBar initialInstances={initialInstances} />

          <HomeContent
            categories={serializedCategories}
            unclassifiedCards={serializedUnclassified}
            networkMode={networkMode}
            cardSimpleMode={cardSimpleMode}
            cardStatusBadge={cardStatusBadge}
          />
        </VStack>
      </AppShell>
    </>
  );
}
