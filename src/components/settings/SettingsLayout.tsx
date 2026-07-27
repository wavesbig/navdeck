'use client';

import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { List, ListItem } from '@astryxdesign/core/List';
import { VStack } from '@astryxdesign/core/VStack';
import {
  ArrowLeft,
  FolderTree,
  Network,
  Palette,
  Settings,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/settings/general',
    label: '基础设置',
    icon: <Settings size={16} />,
  },
  { href: '/settings/account', label: '账号', icon: <User size={16} /> },
  { href: '/settings/network', label: '网络', icon: <Network size={16} /> },
  { href: '/settings/theme', label: '主题', icon: <Palette size={16} /> },
  {
    href: '/settings/categories',
    label: '分类管理',
    icon: <FolderTree size={16} />,
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

/**
 * 设置面板布局
 *
 * - 桌面（≥768px）：左侧 240px tab 导航 + 右侧内容
 * - 移动（<768px）：顶部水平滚动 tab + 下方内容
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <VStack gap={4} className="mx-auto w-full max-w-[1024px]">
      {/* 顶部：返回主页链接 */}
      <HStack gap={2} align="center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>返回主页</span>
        </Link>
      </HStack>

      <Heading level={3}>设置</Heading>

      {/* 主体：左侧 tab（桌面） / 顶部水平 tab（移动） */}
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        {/* tab 导航 */}
        <nav className="md:sticky md:top-6 md:self-start">
          {/* 桌面：垂直 List */}
          <div className="hidden md:block">
            <List density="compact">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <ListItem
                    key={item.href}
                    label={item.label}
                    href={item.href}
                    isSelected={isActive}
                    startContent={item.icon}
                  />
                );
              })}
            </List>
          </div>

          {/* 移动：水平滚动 chip */}
          <div className="md:hidden -mx-1 px-1 overflow-x-auto">
            <HStack gap={1} className="flex-nowrap">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                      isActive
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-secondary hover:text-primary'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </HStack>
          </div>
        </nav>

        {/* 右侧内容区 */}
        <section className="min-w-0">{children}</section>
      </div>
    </VStack>
  );
}
