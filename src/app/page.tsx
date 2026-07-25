import {AppShell} from '@astryxdesign/core/AppShell';
import {Header} from '@/components/layout/Header';
import {HomeContent} from '@/components/layout/HomeContent';
import {WidgetBar} from '@/components/layout/WidgetBar';

/**
 * 主页布局
 *
 * 桌面端（≥1024px）：
 *   - 主体最大宽度 1440px 居中
 *   - 主区域 + 右侧 widget 栏（360px）
 * 移动端（<1024px）：
 *   - 单列布局，widget 栏移到主体下方
 */
export default function HomePage() {
  return (
    <AppShell topNav={<Header />} contentPadding={4} height="fill">
      <div className="mx-auto w-full max-w-[1440px] grid gap-6 lg:grid-cols-[1fr_360px]">
        <HomeContent />
        <aside className="lg:sticky lg:top-4 lg:self-start order-2 lg:order-none">
          <WidgetBar />
        </aside>
      </div>
    </AppShell>
  );
}
