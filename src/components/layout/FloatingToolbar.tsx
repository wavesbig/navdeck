'use client';

import {
  DropdownMenu,
  DropdownMenuDivider,
  DropdownMenuItem,
} from '@astryxdesign/core/DropdownMenu';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { useToast } from '@astryxdesign/core/Toast';
import {
  Check,
  CircleUserRound,
  Command,
  Grid2x2,
  Info,
  LayoutTemplate,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Settings,
  Sun,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { AboutDialog } from '@/components/layout/AboutDialog';
import {
  BATCH_DELETE_MODE_EVENT,
  CARD_SIMPLE_MODE_EVENT,
} from '@/components/layout/card-view-events';
import { EDIT_MODE_CHANGE_EVENT } from '@/components/layout/edit-mode-event';
import { CmdKModal } from '@/components/search/CmdKModal';
import { useTheme } from '@/hooks/useTheme';
import { useWidgetBarVisibility } from '@/hooks/useWidgetBarVisibility';
import {
  NETWORK_MODE_CHANGE_EVENT,
  NETWORK_MODE_META,
  NETWORK_MODE_ORDER,
} from '@/lib/network-mode';
import { APP_VERSION } from '@/lib/version';
import { preferencesApi } from '@/services';
import type { NetworkMode, ThemeMode } from '@/types';

interface FloatingToolbarProps {
  networkMode: NetworkMode;
  /** 卡片简洁模式（SSR 初始值） */
  cardSimpleMode: boolean;
}

/**
 * 右上角浮动工具栏（floating pill）
 *
 * - position: fixed，脱离居中容器
 * - 贴近视口右上角（top-6 right-6）
 * - 胶囊容器：毛玻璃 + 圆角 999 + hairline 边框 + 阴影
 *
 * 分区逻辑：环境（网络/主题）｜ 视图（⌘/Widget/简洁）｜ 模式（编辑/批量）｜ 账户
 * 高频操作直达，低频配置在设置页，账户菜单只做导航。
 */
export function FloatingToolbar({
  networkMode,
  cardSimpleMode,
}: FloatingToolbarProps) {
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(cardSimpleMode);
  const [netMode, setNetMode] = useState<NetworkMode>(networkMode);
  const { mode, resolved, setMode } = useTheme();
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

  // 监听设置页触发的网络模式变更，保持工具栏同步
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NetworkMode>).detail;
      if (detail) setNetMode(detail);
    };
    window.addEventListener(NETWORK_MODE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(NETWORK_MODE_CHANGE_EVENT, handler);
  }, []);

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
    const idx = NETWORK_MODE_ORDER.indexOf(netMode);
    const next = NETWORK_MODE_ORDER[(idx + 1) % NETWORK_MODE_ORDER.length];
    setNetMode(next);
    try {
      await preferencesApi.update('networkMode', next);
    } catch (e) {
      console.error('保存网络模式失败', e);
    }
    // 通知主页重新探测状态灯
    window.dispatchEvent(
      new CustomEvent(NETWORK_MODE_CHANGE_EVENT, { detail: next }),
    );
  };

  // 主题三态循环：明亮 → 暗黑 → 跟随系统（与设置页 ThemeForm 选项一致）
  const handleCycleTheme = () => {
    const next: ThemeMode =
      mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    setMode(next);
    void preferencesApi.update('theme', next).catch(() => {
      showToast({ body: '主题未保存到服务端', type: 'error' });
    });
  };

  // 跟随系统时图标展示当前生效明暗，标签标注「跟随系统」
  const themeLabel =
    mode === 'system' ? '跟随系统' : mode === 'dark' ? '暗黑' : '明亮';
  const ThemeIcon =
    mode === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun;

  // 当前网络模式图标
  const network = NETWORK_MODE_META[netMode];
  const NetworkIcon = network.Icon;

  return (
    <>
      <HStack
        gap={1}
        align="center"
        className="fixed top-6 right-4 md:right-6 z-50 rounded-full bg-surface/80 backdrop-blur-md border border-border shadow-md px-1.5 py-1 sm:px-2 md:px-3"
      >
        {/* 环境区：网络模式 + 主题（高频，各自循环/切换） */}
        <IconButton
          label={`网络模式：${network.label}`}
          icon={<NetworkIcon size={16} />}
          variant="ghost"
          tooltip={`网络模式：${network.label}（点击切换）`}
          onClick={() => {
            void handleCycleNetworkMode();
          }}
        />
        <IconButton
          label={`主题：${themeLabel}`}
          icon={<ThemeIcon size={16} />}
          variant="ghost"
          tooltip={`主题：${themeLabel}（点击循环切换）`}
          onClick={handleCycleTheme}
        />

        {/* hairline 分隔 */}
        <span className="mx-2 h-5 w-px bg-border" aria-hidden />

        {/* 视图区：显示开关 */}
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

        {/* 关于：版本与更新日志 */}
        <IconButton
          label="关于"
          icon={<Info size={16} />}
          variant="ghost"
          tooltip="版本与更新日志"
          onClick={() => setAboutOpen(true)}
        />
        {/* 用户菜单：纯导航（设置 / 退出登录）；主题与可达状态配置在设置页 */}
        <ToolbarUserMenu />
      </HStack>

      <CmdKModal isOpen={cmdKOpen} onOpenChange={setCmdKOpen} />
      <AboutDialog isOpen={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
}

/**
 * 用户下拉菜单（纯导航：设置 / 退出登录）
 *
 * 主题切换在工具栏（高频），可达状态在设置页外观分区（低频配置）。
 */
function ToolbarUserMenu() {
  const router = useRouter();

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
    >
      <DropdownMenuItem
        icon={<Settings size={16} />}
        label="设置"
        style={{ paddingInline: 12 }}
        onClick={() => router.push('/settings')}
      />
      <DropdownMenuItem
        icon={<LogOut size={16} />}
        label="退出登录"
        style={{ paddingInline: 12 }}
        onClick={() => {
          // NextAuth 返回的 url 依赖反代 Host；退出后用浏览器当前 origin 跳相对路径
          void signOut({ redirect: false, redirectTo: '/login' }).then(() => {
            router.replace('/login');
          });
        }}
      />
      <DropdownMenuDivider />
      <DropdownMenuItem
        label={`V ${APP_VERSION}`}
        isDisabled
        style={{ paddingInline: 12 }}
      />
    </DropdownMenu>
  );
}
