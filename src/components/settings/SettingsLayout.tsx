'use client';

import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { VStack } from '@astryxdesign/core/VStack';
import {
  ArrowLeft,
  Blocks,
  FolderTree,
  Image as ImageIcon,
  Palette,
  Settings,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/settings/general',
    label: '通用',
    icon: Settings,
  },
  {
    href: '/settings/appearance',
    label: '外观',
    icon: Palette,
  },
  {
    href: '/settings/categories',
    label: '分类管理',
    icon: FolderTree,
  },
  {
    href: '/settings/assets',
    label: '素材管理',
    icon: ImageIcon,
  },
  {
    href: '/settings/integrations',
    label: '集成',
    icon: Blocks,
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

/**
 * 设置面板布局（Client Component）
 *
 * 基于 Astryx Layout 组件系统（参考 settings-sidebar 模板）：
 * - 桌面（≥768px）：Layout + LayoutPanel（左侧 sidebar）+ LayoutContent（右侧内容）
 * - 移动（<768px）：LayoutContent 内顶部 TabList + 下方内容
 *
 * 导航使用 onClick + router.push 实现 SPA 导航（避免整页刷新）。
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  const isNarrow = useMediaQuery('(max-width: 768px)');
  const pathname = usePathname();
  const router = useRouter();

  const navigate = (href: string) => router.push(href);

  // sidebar 导航列表（桌面端用，结构对齐 settings-sidebar 模板）
  const navList = (
    <VStack gap={4} className="px-3 py-4">
      <Heading level={2} className="mx-4">
        设置
      </Heading>
      <List density="spacious">
        {NAV_ITEMS.map((item) => {
          // 精确匹配，或当前路径是该 nav 项的子路径
          // （如 /settings/general/edit 也高亮「通用」）
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <ListItem
              key={item.href}
              label={item.label}
              startContent={<Icon icon={item.icon} />}
              isSelected={isActive}
              onClick={() => navigate(item.href)}
              className={
                isActive
                  ? '[background-color:var(--color-overlay-hover)]'
                  : undefined
              }
            />
          );
        })}
      </List>
      <Divider />
      <List density="spacious">
        <ListItem
          label="返回主页"
          startContent={<Icon icon={ArrowLeft} />}
          onClick={() => navigate('/')}
        />
      </List>
    </VStack>
  );

  // 移动端：顶部水平 TabList + 内容
  if (isNarrow) {
    return (
      <Layout height="auto">
        <LayoutContent padding={0}>
          <VStack gap={4}>
            <TabList value={pathname} onChange={navigate} hasDivider>
              {NAV_ITEMS.map((item) => (
                <Tab key={item.href} value={item.href} label={item.label} />
              ))}
            </TabList>
            {children}
          </VStack>
        </LayoutContent>
      </Layout>
    );
  }

  // 桌面端：左侧 sidebar + 右侧内容
  // height="fill" 让 sidebar 与内容区等高，LayoutPanel 的 hasDivider 贯穿到底
  return (
    <Layout
      height="fill"
      start={
        <LayoutPanel hasDivider padding={0} width={240}>
          {navList}
        </LayoutPanel>
      }
      content={<LayoutContent padding={4}>{children}</LayoutContent>}
    />
  );
}
