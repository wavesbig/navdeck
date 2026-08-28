'use client';

import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { usePathname } from 'next/navigation';
import { SETTINGS_NAV_ITEMS } from '@/components/settings/settings-nav-items';

/**
 * 设置导航单一数据源。
 *
 * 桌面端由 AppShell 渲染为常驻侧栏；
 * md 以下自动迁移到 MobileNav 抽屉。
 */
export function SettingsSideNav() {
  const pathname = usePathname();

  return (
    <SideNav
      header={
        <div className="md:pt-20">
          <SideNavHeading heading="设置" />
        </div>
      }
    >
      <SideNavSection title="站点设置">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <SideNavItem
              key={item.href}
              label={item.label}
              href={item.href}
              icon={item.icon}
              isSelected={isActive}
            />
          );
        })}
      </SideNavSection>
    </SideNav>
  );
}
