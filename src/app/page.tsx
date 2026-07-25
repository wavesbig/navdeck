import {AppShell} from '@astryxdesign/core/AppShell';
import {VStack} from '@astryxdesign/core/VStack';
import {FloatingLogo} from '@/components/layout/FloatingLogo';
import {FloatingToolbar} from '@/components/layout/FloatingToolbar';
import {SearchBox} from '@/components/search/SearchBox';
import {HomeContent} from '@/components/layout/HomeContent';
import {WidgetBar} from '@/components/layout/WidgetBar';

/**
 * 主页布局（无传统顶栏）
 *
 * 结构：
 * - 左上：FloatingLogo（fixed）
 * - 右上：FloatingToolbar（fixed floating pill）
 * - 主体容器：max-w-1440px 居中
 *   - 搜索框：独立居中，距顶部约 80px（为浮动 Logo/工具栏留空间）
 *   - 主体分栏：卡片网格（flex-1） + 右侧 widget 栏（360px）
 *
 * 移动端：widget 栏移到主体下方
 */
export default function HomePage() {
  return (
    <AppShell contentPadding={4} height="fill">
      <FloatingLogo />
      <FloatingToolbar />

      <VStack gap={4} className="mx-auto w-full max-w-[1440px] pt-20">
        <SearchBox />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <HomeContent />
          <aside className="lg:sticky lg:top-28 lg:self-start order-2 lg:order-none">
            <WidgetBar />
          </aside>
        </div>
      </VStack>
    </AppShell>
  );
}
