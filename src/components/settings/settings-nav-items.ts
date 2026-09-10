import {
  Blocks,
  FolderTree,
  Image as ImageIcon,
  Info,
  Palette,
  Search,
  Settings,
} from 'lucide-react';

export interface SettingsNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
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
    href: '/settings/search',
    label: '搜索',
    icon: Search,
  },
  {
    href: '/settings/categories',
    label: '分类',
    icon: FolderTree,
  },
  {
    href: '/settings/assets',
    label: '素材',
    icon: ImageIcon,
  },
  {
    href: '/settings/integrations',
    label: '同步',
    icon: Blocks,
  },
  {
    href: '/settings/about',
    label: '关于',
    icon: Info,
  },
];

export function getActiveSettingsNavItem(pathname: string) {
  return SETTINGS_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
