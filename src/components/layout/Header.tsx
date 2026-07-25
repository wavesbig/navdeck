import Link from 'next/link';
import {HStack} from '@astryxdesign/core/HStack';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Settings, PanelRight} from 'lucide-react';

/**
 * 顶部导航栏（浮动胶囊式）
 * - 仅含 Logo 左 + 设置/widget 切换右
 * - 搜索框独立在外，不与 Logo/设置同行
 */
export function Header() {
  return (
    <HStack
      gap={4}
      align="center"
      justify="between"
      className="mx-4 mt-4 rounded-2xl bg-surface shadow-md border border-border px-4 py-2"
    >
      <Link
        href="/"
        className="flex items-center gap-2 shrink-0 text-primary"
      >
        <NavDeckLogo />
        <span className="font-semibold">NavDeck</span>
      </Link>

      <HStack gap={1} align="center" className="shrink-0">
        <IconButton
          label="切换 widget 栏"
          icon={<PanelRight />}
          variant="ghost"
          tooltip="显示/隐藏 widget 栏"
        />
        <Link href="/settings">
          <IconButton
            label="设置"
            icon={<Settings />}
            variant="ghost"
            tooltip="设置"
          />
        </Link>
      </HStack>
    </HStack>
  );
}

/** NavDeck Logo 占位（M1.3 用文字图标，M1.10 替换为正式 logo） */
function NavDeckLogo() {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-on-accent font-bold text-sm">
      N
    </span>
  );
}
