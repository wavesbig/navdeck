'use client';

import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { useToast } from '@astryxdesign/core/Toast';
import {
  Check,
  CircleUserRound,
  Command,
  Globe,
  Grid2x2,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Server,
  Settings,
  Sun,
  Wand2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { EDIT_MODE_CHANGE_EVENT } from '@/components/layout/edit-mode-event';
import { CmdKModal } from '@/components/search/CmdKModal';
import { useTheme } from '@/hooks/useTheme';
import { useWidgetBarVisibility } from '@/hooks/useWidgetBarVisibility';
import { preferencesApi } from '@/services';
import type { NetworkMode, ThemeMode } from '@/types';

interface FloatingToolbarProps {
  networkMode: NetworkMode;
}

const THEME_ITEMS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] =
  [
    { mode: 'light', label: '明亮', icon: <Sun size={16} /> },
    { mode: 'dark', label: '暗黑', icon: <Moon size={16} /> },
    { mode: 'system', label: '跟随系统', icon: <Monitor size={16} /> },
  ];

const NETWORK_META: Record<
  NetworkMode,
  { label: string; icon: React.ReactNode }
> = {
  auto: { label: 'Auto', icon: <Wand2 size={16} /> },
  internal: { label: '内网', icon: <Server size={16} /> },
  external: { label: '外网', icon: <Globe size={16} /> },
};

const NETWORK_ORDER: NetworkMode[] = ['auto', 'internal', 'external'];

/**
 * 右上角浮动工具栏（floating pill）
 *
 * - position: fixed，脱离居中容器
 * - 贴近视口右上角（top-6 right-6）
 * - 胶囊容器：毛玻璃 + 圆角 999 + hairline 边框 + 阴影
 *
 * 高频入口常驻：网络模式、Cmd+K、Widget 栏、编辑模式。
 * 低频项（设置 / 主题 / 退出登录）聚合进用户下拉菜单。
 */
export function FloatingToolbar({ networkMode }: FloatingToolbarProps) {
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [netMode, setNetMode] = useState<NetworkMode>(networkMode);
  const { mode, setMode } = useTheme();
  const { visible: widgetBarVisible, setVisible: setWidgetBarVisible } =
    useWidgetBarVisibility();
  const showToast = useToast();
  const router = useRouter();

  // dispatch 编辑模式变更（同时通知 HomeContent + WidgetBar）
  const dispatchEditModeChange = useCallback((value: boolean) => {
    setEditMode(value);
    window.dispatchEvent(
      new CustomEvent(EDIT_MODE_CHANGE_EVENT, { detail: value }),
    );
  }, []);

  // 监听外部触发的编辑模式变更（如 WidgetBar 添加 widget 后自动进入编辑态）
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setEditMode(detail);
    };
    window.addEventListener(EDIT_MODE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(EDIT_MODE_CHANGE_EVENT, handler);
  }, []);

  // ESC 退出编辑模式（统一管理，HomeContent/WidgetBar 不再各自监听 ESC）
  useEffect(() => {
    if (!editMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatchEditModeChange(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editMode, dispatchEditModeChange]);

  // 全局 Cmd+K / Ctrl+K 快捷键监听
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdKOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 网络模式循环切换：auto → internal → external（原 NetworkToggle 逻辑）
  const handleCycleNetworkMode = async () => {
    const idx = NETWORK_ORDER.indexOf(netMode);
    const next = NETWORK_ORDER[(idx + 1) % NETWORK_ORDER.length];
    setNetMode(next);
    try {
      await preferencesApi.update('networkMode', next);
    } catch (e) {
      console.error('保存网络模式失败', e);
    }
    // 通知主页重新探测状态灯
    window.dispatchEvent(
      new CustomEvent('network-mode-change', { detail: next }),
    );
  };

  // 设置主题并持久化到服务端（与 ThemeForm 一致）
  const handleSetTheme = (next: ThemeMode) => {
    setMode(next);
    void preferencesApi.update('theme', next).catch(() => {
      showToast({ body: '主题未保存到服务端', type: 'error' });
    });
  };

  // 当前网络模式图标
  const network = NETWORK_META[netMode];

  return (
    <>
      <HStack
        gap={1}
        align="center"
        className="fixed top-6 right-4 md:right-6 z-50 rounded-full bg-surface/80 backdrop-blur-md border border-border shadow-md px-1.5 py-1 sm:px-2 md:px-3"
      >
        {/* 网络模式循环切换（高频） */}
        <IconButton
          label={`网络模式：${network.label}`}
          icon={network.icon}
          variant="ghost"
          tooltip={`网络模式：${network.label}（点击切换）`}
          onClick={() => {
            void handleCycleNetworkMode();
          }}
        />

        {/* hairline 分隔 */}
        <span className="mx-2 h-5 w-px bg-border" aria-hidden />

        {/* 高频工具按钮 */}
        <IconButton
          label="快捷启动器"
          icon={<Command size={16} />}
          variant="ghost"
          tooltip="Cmd+K"
          onClick={() => setCmdKOpen(true)}
        />
        <IconButton
          label={widgetBarVisible ? '隐藏 Widget' : '显示 Widget'}
          icon={<Grid2x2 size={16} />}
          variant={widgetBarVisible ? 'secondary' : 'ghost'}
          tooltip={widgetBarVisible ? '隐藏 Widget 横条' : '显示 Widget 横条'}
          aria-pressed={widgetBarVisible}
          onClick={() => setWidgetBarVisible(!widgetBarVisible)}
        />
        <IconButton
          label={editMode ? '完成' : '编辑'}
          icon={editMode ? <Check size={16} /> : <Pencil size={16} />}
          variant={editMode ? 'primary' : 'ghost'}
          tooltip={editMode ? '完成编辑（ESC）' : '编辑模式'}
          onClick={() => dispatchEditModeChange(!editMode)}
        />

        {/* 用户菜单：设置 / 主题 / 退出登录 */}
        <DropdownMenu
          hasChevron={false}
          alignment="end"
          menuWidth={200}
          button={{
            label: '用户菜单',
            variant: 'ghost',
            isIconOnly: true,
            icon: <CircleUserRound size={16} />,
          }}
          items={[
            {
              type: 'section',
              title: '外观',
              id: 'theme',
              items: THEME_ITEMS.map((item) => ({
                id: item.mode,
                label: item.label,
                icon: item.icon,
                endContent:
                  mode === item.mode ? <Check size={14} /> : undefined,
                onClick: () => handleSetTheme(item.mode),
              })),
            },
            { type: 'divider', id: 'divider' },
            {
              label: '设置',
              icon: <Settings size={16} />,
              onClick: () => router.push('/settings'),
            },
            {
              label: '退出登录',
              icon: <LogOut size={16} />,
              onClick: () => {
                void signOut({ redirectTo: '/login' });
              },
            },
          ]}
        />
      </HStack>

      <CmdKModal isOpen={cmdKOpen} onOpenChange={setCmdKOpen} />
    </>
  );
}
