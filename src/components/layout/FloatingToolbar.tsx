'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { useToast } from '@astryxdesign/core/Toast';
import {
  Check,
  Command,
  Grid2x2,
  Monitor,
  Moon,
  Pencil,
  Settings,
  Sun,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EDIT_MODE_CHANGE_EVENT } from '@/components/layout/edit-mode-event';
import { NetworkToggle } from '@/components/layout/NetworkToggle';
import { CmdKModal } from '@/components/search/CmdKModal';
import { useTheme } from '@/hooks/useTheme';
import { useWidgetBarVisibility } from '@/hooks/useWidgetBarVisibility';
import { preferencesApi } from '@/services';
import type { NetworkMode, ThemeMode } from '@/types';

interface FloatingToolbarProps {
  networkMode: NetworkMode;
}

/**
 * 右上角浮动工具栏（floating pill）
 *
 * - position: fixed，脱离居中容器
 * - 贴近视口右上角（top-6 right-6）
 * - 胶囊容器：毛玻璃 + 圆角 999 + hairline 边框 + 阴影
 *
 * 元素从左到右：
 * 1. NAS 状态圆点占位（M1.7 接入真实数据）
 * 2. 网络模式开关（auto / 内网 / 外网）
 * 3. hairline 分隔
 * 4. Cmd+K 入口 → 唤起 CmdKModal
 * 5. widget 栏切换（dispatch 'widget-bar-toggle' 事件，WidgetBar 监听）
 * 6. 设置
 */
export function FloatingToolbar({ networkMode }: FloatingToolbarProps) {
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { mode, setMode } = useTheme();
  const { visible: widgetBarVisible, setVisible: setWidgetBarVisible } =
    useWidgetBarVisibility();
  const showToast = useToast();

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

  // 主题快捷切换：light → dark → system → light 循环
  const handleToggleTheme = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(mode);
    const next = order[(idx + 1) % order.length];
    setMode(next);
    // 持久化到服务端（与 ThemeForm 一致）
    void preferencesApi.update('theme', next).catch(() => {
      showToast({ body: '主题未保存到服务端', type: 'error' });
    });
  };

  // 当前模式对应的图标
  const themeIcon =
    mode === 'light' ? (
      <Sun size={16} />
    ) : mode === 'dark' ? (
      <Moon size={16} />
    ) : (
      <Monitor size={16} />
    );
  const themeLabel =
    mode === 'light' ? '明亮' : mode === 'dark' ? '暗黑' : '跟随系统';

  return (
    <>
      <HStack
        gap={1}
        align="center"
        className="fixed top-6 right-4 md:right-6 z-50 rounded-full bg-surface/80 backdrop-blur-md border border-border shadow-md px-1.5 py-1 sm:px-2 md:px-3"
      >
        {/* NAS 状态圆点占位（仅桌面显示，移动端隐藏节省空间） */}
        <span className="hidden md:inline-flex">
          <NasStatusDot />
        </span>

        {/* 网络模式三态切换（小屏隐藏，默认 auto） */}
        <span className="hidden sm:inline-flex">
          <NetworkToggle initialMode={networkMode} />
        </span>

        {/* hairline 分隔（小屏隐藏） */}
        <span className="hidden sm:block mx-2 h-5 w-px bg-border" aria-hidden />

        {/* 工具按钮组 */}
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
        <IconButton
          label={`主题：${themeLabel}`}
          icon={themeIcon}
          variant="ghost"
          tooltip={`主题：${themeLabel}（点击切换）`}
          onClick={handleToggleTheme}
        />
        <Link href="/settings">
          <IconButton
            label="设置"
            icon={<Settings size={16} />}
            variant="ghost"
            tooltip="设置"
          />
        </Link>
      </HStack>

      <CmdKModal isOpen={cmdKOpen} onOpenChange={setCmdKOpen} />
    </>
  );
}

/** NAS 状态圆点占位（M1.7 接入真实数据，绿/灰） */
function NasStatusDot() {
  return (
    <span
      className="inline-block size-2 rounded-full bg-success"
      title="NAS 状态"
    />
  );
}
