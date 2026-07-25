import Link from 'next/link';
import {TopNav, TopNavHeading} from '@astryxdesign/core/TopNav';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Settings, PanelRight} from 'lucide-react';
import {SearchBox} from '@/components/search/SearchBox';

/**
 * 顶部导航栏
 * - 左：Logo + NavDeck 标题
 * - 中：独立居中搜索框
 * - 右：widget 栏切换 + 设置
 */
export function Header() {
  return (
    <TopNav
      heading={
        <TopNavHeading
          logo={<NavDeckLogo />}
          heading="NavDeck"
          headingHref="/"
        />
      }
      centerContent={<SearchBox />}
      endContent={
        <>
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
        </>
      }
    />
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
