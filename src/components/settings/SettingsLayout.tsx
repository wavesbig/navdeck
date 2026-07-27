import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { BackToHomeLink, SettingsNav } from '@/components/settings/SettingsNav';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

/**
 * 设置面板布局（Server Component 外壳）
 *
 * - 桌面（≥768px）：左侧 240px tab 导航 + 右侧内容
 * - 移动（<768px）：顶部水平滚动 tab + 下方内容
 *
 * nav 部分因为要用 usePathname() 计算高亮，拆为独立 client island <SettingsNav />。
 * 外壳（标题、返回链接、grid 布局、children 容器）走 RSC。
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <VStack gap={4} className="mx-auto w-full max-w-[1024px]">
      {/* 顶部：返回主页链接 */}
      <HStack gap={2} align="center">
        <BackToHomeLink />
      </HStack>

      <Heading level={3}>设置</Heading>

      {/* 主体：左侧 tab（桌面） / 顶部水平 tab（移动） */}
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <SettingsNav />

        {/* 右侧内容区 */}
        <section className="min-w-0">{children}</section>
      </div>
    </VStack>
  );
}
