'use client';

import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { Plus, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WidgetGrid } from '@/components/layout/WidgetGrid';
import { DateItemCreateDialog } from '@/components/widgets/DateItemCreateDialog';
import { WidgetConfigPanel } from '@/components/widgets/WidgetConfig';
import { WidgetLibrary } from '@/components/widgets/WidgetLibrary';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { useWidgetInstances } from '@/hooks/useWidgetConfig';
import { widgetsApi } from '@/services/widgets';
import type { WidgetBarWidth, WidgetInstance, WidgetKey } from '@/types';

const WIDGET_LABELS: Record<WidgetKey, string> = {
  'nas-status': 'NAS 状态',
  'resource-gauge': '资源水位',
  countdown: '倒数日',
  countup: '正数日',
};

interface WidgetBarProps {
  initialInstances?: WidgetInstance[];
  /** SSR 初值，避免客户端 hydration 前宽度闪烁 */
  initialBarWidth?: WidgetBarWidth;
}

/**
 * Widget 栏容器
 *
 * 栏级 chrome：标题行、配置 Popover、添加流程（WidgetLibrary +
 * DateItemCreateDialog）、可见性切换、可撤销删除；
 * 网格渲染与拖拽交互见 WidgetGrid。
 * 编辑模式由 FloatingToolbar 统一管控（edit-mode-change 事件），
 * WidgetBar 仅监听事件同步本地 isEditMode state。
 */
export function WidgetBar({
  initialInstances,
  initialBarWidth = 360,
}: WidgetBarProps) {
  const {
    instances,
    isLoading,
    barWidth,
    reorderInstances,
    setInstanceSize,
    removeInstanceDeferred,
    addInstance,
    refresh,
  } = useWidgetInstances();
  const showToast = useToast();
  const [configOpen, setConfigOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // 待创建的日期类 widget（先填日期再出卡片，非 null 时弹出独立表单）
  const [createKey, setCreateKey] = useState<'countdown' | 'countup' | null>(
    null,
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { scheduleDelete } = useUndoableDelete();

  // 用 SSR 初值避免 hydration 闪烁，客户端 SWR 加载后切换为实际值
  const effectiveBarWidth = isLoading ? initialBarWidth : barWidth;

  // 同步 barWidth 到 documentElement CSS 变量。
  // page.tsx 不再设 CSS 变量，由这里全权管理，避免 server component
  // inline style 无法被客户端覆盖的问题。
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--widget-bar-width',
      `${effectiveBarWidth}px`,
    );
  }, [effectiveBarWidth]);

  // Popover/ContextMenu 的 fixed wrapper 未设 z-index，在 AppShell 内被覆盖。
  // 当任意弹出层打开时，查找 fixed wrapper 并提升 z-index。
  useEffect(() => {
    if (!configOpen && !libraryOpen && !isEditMode) return;
    const fixZIndex = () => {
      document
        .querySelectorAll('[role=dialog], .astryx-context-menu')
        .forEach((el) => {
          let node = el as HTMLElement | null;
          while (node && node !== document.body) {
            if (getComputedStyle(node).position === 'fixed') {
              node.style.zIndex = '50';
              break;
            }
            node = node.parentElement;
          }
        });
    };
    fixZIndex();
    // Popover 定位可能延迟一帧
    const timer = setTimeout(fixZIndex, 0);
    return () => clearTimeout(timer);
  }, [configOpen, libraryOpen, isEditMode]);

  // 监听 FloatingToolbar 的编辑模式变更事件
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setIsEditMode(detail);
    };
    window.addEventListener('edit-mode-change', handler);
    return () => window.removeEventListener('edit-mode-change', handler);
  }, []);

  // 空日期卡片自弃：widget 配置弹窗关闭且没有日期项时静默移除实例
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ instanceId?: string }>).detail?.instanceId;
      if (!id) return;
      const { commit } = removeInstanceDeferred(id);
      void commit();
    };
    window.addEventListener('widget-instance-remove', handler);
    return () => window.removeEventListener('widget-instance-remove', handler);
  }, [removeInstanceDeferred]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('widget-bar-visible');
      if (stored !== null) setIsVisible(stored === 'true');
    } catch {
      // 忽略
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      const next = typeof detail === 'boolean' ? detail : !isVisible;
      setIsVisible(next);
      try {
        localStorage.setItem('widget-bar-visible', String(next));
      } catch {
        // 忽略
      }
    };
    window.addEventListener('widget-bar-toggle', handler);
    return () => window.removeEventListener('widget-bar-toggle', handler);
  }, [isVisible]);

  // SSR 初始值仅在 SWR 首次加载期间用作占位，避免空闪；
  // 加载完成后信任 instances（即使为空），否则删除全部 widget 后
  // 会持续回退到 SSR 种子数据导致"删不掉"的 bug
  const effectiveInstances = useMemo(
    () => (isLoading ? (initialInstances ?? []) : instances),
    [instances, initialInstances, isLoading],
  );

  // 可撤销删除：乐观更新移除 + toast 撤销
  const handleRemove = useCallback(
    (id: string) => {
      const inst = effectiveInstances.find((i) => i.id === id);
      const label = inst
        ? (WIDGET_LABELS[inst.widgetKey] ?? '此 widget')
        : '此 widget';
      const { undo, commit } = removeInstanceDeferred(id);
      scheduleDelete({
        label,
        onConfirm: () => void commit(),
        onUndo: undo,
      });
    },
    [effectiveInstances, removeInstanceDeferred, scheduleDelete],
  );

  // 日期类 widget 创建：先建实例再建日期项，全部成功后刷新列表出卡片；
  // 日期项失败时回滚实例，避免残留空卡片
  const handleCreateSubmit = async (input: {
    name: string;
    date: string;
    recurUnit?: 'week' | 'month' | 'year' | null;
  }) => {
    if (!createKey) return;
    const inst = await widgetsApi.createInstance({
      widgetKey: createKey,
      size: 'M',
    });
    try {
      await widgetsApi.createDateItem(inst.id, {
        name: input.name,
        date: input.date,
        ...(createKey === 'countdown'
          ? { recurUnit: input.recurUnit ?? null }
          : {}),
      });
    } catch (e) {
      await widgetsApi.deleteInstance(inst.id).catch(() => {});
      throw e;
    }
    await refresh();
    showToast({ body: `已添加「${input.name}」`, type: 'info' });
  };

  const configPopover = (
    <Popover
      isOpen={configOpen}
      onOpenChange={setConfigOpen}
      placement="below"
      alignment="end"
      width={320}
      label="配置 widget 栏"
      content={<WidgetConfigPanel />}
    >
      <IconButton
        label="配置 widget 栏"
        icon={<Settings size={18} />}
        variant="ghost"
        tooltip="栏配置"
      />
    </Popover>
  );

  if (!isVisible) {
    return (
      <VStack gap={2} className="justify-end items-end">
        {configPopover}
      </VStack>
    );
  }

  return (
    <VStack gap={3} className="group/widget-bar">
      <div className="flex items-center justify-between">
        <span className="text-eyebrow">今日 · WIDGETS</span>
        <div
          className={`flex items-center gap-1 transition-opacity duration-200 ${
            isEditMode
              ? 'opacity-100'
              : 'opacity-0 group-hover/widget-bar:opacity-100'
          }`}
        >
          {!isEditMode && (
            <IconButton
              label="添加 widget"
              icon={<Plus size={18} />}
              variant="ghost"
              tooltip="添加 widget"
              onClick={() => setLibraryOpen(true)}
            />
          )}
          {configPopover}
        </div>
      </div>

      {effectiveInstances.length > 0 ? (
        <WidgetGrid
          instances={effectiveInstances}
          isEditMode={isEditMode}
          onReorder={reorderInstances}
          onResize={setInstanceSize}
          onRemove={handleRemove}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <VStack gap={3} align="center">
            <span className="text-sm text-secondary">还没有 widget</span>
            <IconButton
              label="添加"
              icon={<Plus size={18} />}
              variant="ghost"
              tooltip="添加 widget"
              onClick={() => setLibraryOpen(true)}
            />
          </VStack>
        </div>
      )}

      <DateItemCreateDialog
        widgetKey={createKey}
        onOpenChange={(open) => {
          if (!open) setCreateKey(null);
        }}
        onSubmit={handleCreateSubmit}
      />

      <WidgetLibrary
        isOpen={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={async (key) => {
          setLibraryOpen(false);
          // 日期类 widget 先填日期再出卡片（取消则什么都不创建）
          if (key === 'countdown' || key === 'countup') {
            setCreateKey(key);
            return;
          }
          const created = await addInstance(key);
          if (created) {
            const label = key === 'nas-status' ? 'NAS 状态' : '资源水位';
            showToast({ body: `已添加「${label}」`, type: 'info' });
          }
        }}
      />
    </VStack>
  );
}
