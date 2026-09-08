'use client';

import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { usePathname, useRouter } from 'next/navigation';
import {
  getActiveSettingsNavItem,
  SETTINGS_NAV_ITEMS,
} from '@/components/settings/settings-nav-items';
import { APP_VERSION } from '@/lib/version';

/**
 * 设置导航单一数据源。
 *
 * 桌面端由 AppShell 渲染为常驻侧栏。
 */
function SettingsNavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <SideNavSection title="站点设置">
      {SETTINGS_NAV_ITEMS.map((item) => {
        const isActive = getActiveSettingsNavItem(pathname)?.href === item.href;

        return (
          <SideNavItem
            key={item.href}
            label={item.label}
            href={item.href}
            icon={item.icon}
            isSelected={isActive}
            onClick={onNavigate}
          />
        );
      })}
    </SideNavSection>
  );
}

export function SettingsSideNav() {
  return (
    <SideNav
      // 与 AppShell breakpoint="none" 配合，避免首屏断点切换闪烁。
      className="max-md:hidden"
      header={
        <div className="md:pt-20">
          <SideNavHeading heading="设置" />
        </div>
      }
    >
      <SettingsNavItems />
      <div className="mt-auto px-3 pb-4 text-xs text-secondary">
        NavDeck {APP_VERSION}
      </div>
    </SideNav>
  );
}

export function SettingsMobileNavPicker() {
  const pathname = usePathname();
  const router = useRouter();
  const currentItem =
    getActiveSettingsNavItem(pathname) ?? SETTINGS_NAV_ITEMS[0];

  return (
    <SegmentedControl
      value={currentItem.href}
      onChange={(value) => router.push(value)}
      label="设置分区"
      size="sm"
      layout="fill"
      className="mb-4 md:hidden"
    >
      {SETTINGS_NAV_ITEMS.map((item) => (
        <SegmentedControlItem
          key={item.href}
          value={item.href}
          label={item.label}
        />
      ))}
    </SegmentedControl>
  );
}
