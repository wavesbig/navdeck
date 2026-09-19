'use client';

import { IconButton } from '@astryxdesign/core/IconButton';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { Blocks, Grid2x2, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { AddWidgetDialog } from '@/components/widgets/AddWidgetDialog';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { useWidgetBarVisibility } from '@/hooks/useWidgetBarVisibility';
import { useWidgetInstances } from '@/hooks/useWidgetConfig';
import { WIDGET_REGISTRY } from '@/lib/widgets/registry';
import { widgetsApi } from '@/services/widgets';
import type { WidgetInstance } from '@/types';

// 删除确认等处的标签文案从 widget 注册表读取（单一来源）

interface WidgetBarProps {
  initialInstances?: WidgetInstance[];
}

/**
 * Widget 栏容器
 *
 * 栏级 chrome：标题行、添加流程（AddWidgetDialog）、可见性切换、可撤销删除；
 * 网格渲染与拖拽交互见 WidgetGrid。
 * 编辑模式由 FloatingToolbar 统一管控（edit-mode-change 事件），
 * WidgetBar 仅监听事件同步本地 isEditMode state。
 */
export function WidgetBar({ initialInstances }: WidgetBarProps) {
  const {
    instances,
    isLoading,
    reorderInstances,
    setInstanceSize,
    removeInstanceDeferred,
    addInstance,
    refresh,
  } = useWidgetInstances();
  const showToast = useToast();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { visible: isVisible } = useWidgetBarVisibility();
  const { scheduleDelete } = useUndoableDelete();

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
        ? (WIDGET_REGISTRY[inst.widgetKey]?.label ?? '此 widget')
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

  // 日期类 widget 创建：实例 + 首个日期项一次请求原子落库，
  // 服务端强制「有卡片必有日期」，不再有回滚补丁
  const handleCreateSubmit = async (
    key: 'countdown' | 'countup',
    input: {
      name: string;
      date: string;
      recurUnit?: 'week' | 'month' | 'year' | null;
    },
  ) => {
    await widgetsApi.createInstance({
      widgetKey: key,
      size: 'M',
      initialItem: {
        name: input.name,
        date: input.date,
        ...(key === 'countdown' ? { recurUnit: input.recurUnit ?? null } : {}),
      },
    });
    await refresh();
    showToast({ body: `已添加「${input.name}」`, type: 'info' });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <VStack gap={3} className="group/widget-bar">
      <SectionHeader
        icon={
          <span
            aria-hidden
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-control border border-border bg-surface/70 text-secondary backdrop-blur-sm"
          >
            <Grid2x2 size={16} />
          </span>
        }
        title={<span className="widget-bar-title">WIDGETS</span>}
        actionsAlign="end"
        actions={
          <div
            className={`flex items-center gap-1 transition-opacity duration-200 ${
              isEditMode
                ? 'invisible opacity-0'
                : 'opacity-0 group-hover/widget-bar:opacity-100 max-md:pointer-coarse:opacity-100'
            }`}
          >
            <IconButton
              label="添加 widget"
              icon={<Plus size={18} />}
              variant="ghost"
              tooltip="添加 widget"
              onClick={() => setLibraryOpen(true)}
            />
          </div>
        }
      />

      {effectiveInstances.length > 0 ? (
        <WidgetGrid
          instances={effectiveInstances}
          isEditMode={isEditMode}
          onReorder={reorderInstances}
          onResize={setInstanceSize}
          onRemove={handleRemove}
        />
      ) : (
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="widget-bar-empty"
        >
          <span className="widget-bar-empty-icon">
            <Blocks size={18} />
          </span>
          <span className="text-sm font-medium">还没有 widget</span>
          <span className="text-xs text-secondary">
            点击添加倒数日、NAS 状态等卡片
          </span>
        </button>
      )}

      <AddWidgetDialog
        isOpen={libraryOpen}
        onOpenChange={setLibraryOpen}
        onAddInstance={async (key) => {
          const created = await addInstance(key);
          if (created) {
            showToast({
              body: `已添加「${WIDGET_REGISTRY[key].label}」`,
              type: 'info',
            });
          }
        }}
        onCreateDate={handleCreateSubmit}
      />
    </VStack>
  );
}
