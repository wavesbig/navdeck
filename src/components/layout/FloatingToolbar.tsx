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
  LayoutTemplate,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Server,
  Settings,
  Sun,
  Wand2,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import {
  BATCH_DELETE_MODE_EVENT,
  CARD_SIMPLE_MODE_EVENT,
} from '@/components/layout/card-view-events';
import { EDIT_MODE_CHANGE_EVENT } from '@/components/layout/edit-mode-event';
import { CmdKModal } from '@/components/search/CmdKModal';
import { useTheme } from '@/hooks/useTheme';
import { useWidgetBarVisibility } from '@/hooks/useWidgetBarVisibility';
import { preferencesApi } from '@/services';
import type { NetworkMode, ThemeMode } from '@/types';

interface FloatingToolbarProps {
  networkMode: NetworkMode;
  /** 卡片简洁模式（SSR 初始值） */
  cardSimpleMode: boolean;
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
export function FloatingToolbar({
  networkMode,
  cardSimpleMode,
}: FloatingToolbarProps) {
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(cardSimpleMode);
  const [netMode, setNetMode] = useState<NetworkMode>(networkMode);
  const { visible: widgetBarVisible, setVisible: setWidgetBarVisible } =
    useWidgetBarVisibility();
  const showToast = useToast();
  // 批量删除仅作用于主页卡片，设置页不显示入口
  const pathname = usePathname();

  // dispatch 编辑模式变更（同时通知 HomeContent + WidgetBar）
  const dispatchEditModeChange = useCallback((value: boolean) => {
    setEditMode(value);
    window.dispatchEvent(
      new CustomEvent(EDIT_MODE_CHANGE_EVENT, { detail: value }),
    );
  }, []);

  // dispatch 批量删除模式变更（通知 HomeContent 进入卡片多选态）
  const dispatchBatchModeChange = useCallback((value: boolean) => {
    setBatchMode(value);
    window.dispatchEvent(
      new CustomEvent(BATCH_DELETE_MODE_EVENT, { detail: value }),
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

  // 监听外部触发的批量删除模式变更（如 HomeContent 底部操作条「取消」）
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setBatchMode(detail);
    };
    window.addEventListener(BATCH_DELETE_MODE_EVENT, handler);
    return () => window.removeEventListener(BATCH_DELETE_MODE_EVENT, handler);
  }, []);

  // ESC 逐层退出画布模式：批量删除 → 编辑模式（统一管理，HomeContent/WidgetBar 不再各自监听 ESC）
  useEffect(() => {
    if (!editMode && !batchMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 逐层退出：先批量删除，再编辑模式
        if (batchMode) {
          dispatchBatchModeChange(false);
        } else if (editMode) {
          dispatchEditModeChange(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editMode, batchMode, dispatchEditModeChange, dispatchBatchModeChange]);

  // 切换卡片简洁模式：持久化 + 通知 HomeContent 即时生效
  const handleToggleSimpleMode = () => {
    const next = !simpleMode;
    setSimpleMode(next);
    void preferencesApi.update('cardSimpleMode', next).catch(() => {
      showToast({ body: '简洁模式未保存到服务端', type: 'error' });
    });
    window.dispatchEvent(
      new CustomEvent(CARD_SIMPLE_MODE_EVENT, { detail: next }),
    );
  };

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
          label={simpleMode ? '退出简洁模式' : '卡片简洁模式'}
          icon={<LayoutTemplate size={16} />}
          variant={simpleMode ? 'secondary' : 'ghost'}
          tooltip={simpleMode ? '退出简洁模式' : '卡片简洁模式（仅图标）'}
          aria-pressed={simpleMode}
          onClick={handleToggleSimpleMode}
        />
        {/* hairline 分隔：视图区 | 模式区 */}
        <span className="mx-2 h-5 w-px bg-border" aria-hidden />

        <IconButton
          label={editMode ? '完成' : '编辑'}
          icon={editMode ? <Check size={16} /> : <Pencil size={16} />}
          variant={editMode ? 'primary' : 'ghost'}
          tooltip={editMode ? '完成编辑（ESC）' : '编辑模式'}
          onClick={() => {
            // 关闭编辑模式时连带退出批量删除（批量删除是编辑态的二级模式）
            if (editMode && batchMode) dispatchBatchModeChange(false);
            dispatchEditModeChange(!editMode);
          }}
        />
        {/* 批量删除：编辑模式的二级操作（多选点击与拖拽手势冲突，按层级嵌套） */}
        {editMode && pathname === '/' && (
          <IconButton
            label={batchMode ? '退出批量删除' : '批量删除卡片'}
            icon={<ListChecks size={16} />}
            variant={batchMode ? 'secondary' : 'ghost'}
            tooltip={batchMode ? '退出批量删除（ESC）' : '批量删除卡片'}
            aria-pressed={batchMode}
            onClick={() => dispatchBatchModeChange(!batchMode)}
          />
        )}

        {/* 用户菜单：设置 / 主题 / 退出登录 */}
        <ToolbarUserMenu />
      </HStack>

      <CmdKModal isOpen={cmdKOpen} onOpenChange={setCmdKOpen} />
    </>
  );
}

/**
 * 用户下拉菜单（主题 / 设置 / 退出登录）
 *
 * 从 FloatingToolbar 抽离：账户类低频操作自成一体，
 * 主工具栏只保留高频视图与画布模式控制。
 */
function ToolbarUserMenu() {
  const { mode, setMode } = useTheme();
  const showToast = useToast();
  const router = useRouter();

  // 设置主题并持久化到服务端（与 ThemeForm 一致）
  const handleSetTheme = (next: ThemeMode) => {
    setMode(next);
    void preferencesApi.update('theme', next).catch(() => {
      showToast({ body: '主题未保存到服务端', type: 'error' });
    });
  };

  return (
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
            endContent: mode === item.mode ? <Check size={14} /> : undefined,
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
  );
}
