import { VStack } from '@astryxdesign/core/VStack';
import { BackToHomeLink, SettingsNav } from '@/components/settings/SettingsNav';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

/**
 * 设置面板布局（Server Component 外壳）
 *
 * - 桌面（≥768px）：左侧 200px sticky nav + 右侧内容
 * - 移动（<768px）：顶部水平滚动 chip + 下方内容
 *
 * 不在内容区重复页面级 H4（与 nav 高亮项重复）
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <VStack gap={6} className="mx-auto w-full max-w-[1100px]">
      <BackToHomeLink />

      {/* 主体：左侧 nav（桌面） / 顶部水平 chip（移动） + 右侧内容 */}
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <SettingsNav />

        {/* 右侧内容区 */}
        <section className="min-w-0">{children}</section>
      </div>
    </VStack>
  );
}
