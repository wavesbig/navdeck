'use client';

import { ContextMenu } from '@astryxdesign/core/ContextMenu';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { VStack } from '@astryxdesign/core/VStack';
import { Check, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type LayoutItem,
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
} from 'react-grid-layout';
import useSWR from 'swr';
import { CountdownWidget } from '@/components/widgets/CountdownWidget';
import { CountupWidget } from '@/components/widgets/CountupWidget';
import { NasStatus } from '@/components/widgets/NasStatusWidget';
import { ResourceGauge } from '@/components/widgets/ResourceGaugeWidget';
import { WidgetConfigPanel } from '@/components/widgets/WidgetConfig';
import { WidgetLibrary } from '@/components/widgets/WidgetLibrary';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { useWidgetInstances } from '@/hooks/useWidgetConfig';
import { type DockerStats, widgetsApi } from '@/services/widgets';
import type { WidgetInstance, WidgetKey, WidgetSize } from '@/types';

// Widget 尺寸 → RGL 网格 {w, h} 映射（2 列网格）
const SIZE_TO_WH: Record<WidgetSize, { w: number; h: number }> = {
  S: { w: 1, h: 2 },
  M: { w: 1, h: 4 },
  L: { w: 2, h: 4 },
};
const WH_TO_SIZE: Record<string, WidgetSize> = {
  '1-2': 'S',
  '1-4': 'M',
  '2-4': 'L',
};

const ROW_HEIGHT = 40;
const MARGIN: [number, number] = [8, 8];

const WIDGET_LABELS: Record<WidgetKey, string> = {
  'nas-status': 'NAS 状态',
  'resource-gauge': '资源水位',
  countdown: '倒数日',
  countup: '正数日',
};

/**
 * ContextMenu 包裹器：强制 trigger wrapper 填满父容器
 *
 * Astryx ContextMenu 的 trigger wrapper 默认无 height/width，
 * 用 ref 在 mount 后设为 100%，使 widget 内容能正确填充 RGL grid item。
 */
function WidgetContextMenu({
  items,
  children,
}: {
  items: NonNullable<React.ComponentProps<typeof ContextMenu>['items']>;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (triggerRef.current) {
      triggerRef.current.style.height = '100%';
      triggerRef.current.style.width = '100%';
    }
  }, []);
  return (
    <ContextMenu ref={triggerRef} items={items} menuWidth={160}>
      {children}
    </ContextMenu>
  );
}

const INITIAL_DOCKER_STATS: DockerStats = {
  available: false,
  status: { running: 0, total: 0, stopped: 0 },
  resource: {
    cpuPercent: 0,
    memoryPercent: 0,
    diskReadBytesPerSec: 0,
    diskWriteBytesPerSec: 0,
  },
};

interface WidgetBarProps {
  initialInstances?: WidgetInstance[];
}

/**
 * Widget 栏容器（react-grid-layout v2 驱动）
 *
 * 编辑模式由 FloatingToolbar 统一管控（edit-mode-change 事件），
 * WidgetBar 仅监听事件同步本地 isEditMode state。
 * 删除走右键 ContextMenu + toast 撤销（useUndoableDelete）。
 */
export function WidgetBar({ initialInstances }: WidgetBarProps) {
  const {
    instances,
    isLoading,
    reorderInstances,
    setInstanceSize,
    removeInstanceDeferred,
    addInstance,
  } = useWidgetInstances();
  const [configOpen, setConfigOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
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

  // RGL v2：useContainerWidth 替代 WidthProvider HOC
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });

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

  const { data: dockerData } = useSWR(
    widgetsApi.dockerKey,
    widgetsApi.getDockerStats,
    { refreshInterval: 30_000 },
  );
  const dockerStats = dockerData ?? INITIAL_DOCKER_STATS;

  // SSR 初始值仅在 SWR 首次加载期间用作占位，避免空闪；
  // 加载完成后信任 instances（即使为空），否则删除全部 widget 后
  // 会持续回退到 SSR 种子数据导致"删不掉"的 bug
  const effectiveInstances = useMemo(
    () => (isLoading ? (initialInstances ?? []) : instances),
    [instances, initialInstances, isLoading],
  );

  // instances → RGL layout（两列 bin-packing）
  const layout = useMemo<LayoutItem[]>(() => {
    const sorted = [...effectiveInstances].sort((a, b) => a.order - b.order);
    const result: LayoutItem[] = [];
    let cursorX = 0;
    let cursorY = 0;
    let rowMaxH = 0;

    for (const inst of sorted) {
      const wh = SIZE_TO_WH[inst.size];
      if (cursorX + wh.w > 2) {
        cursorY += rowMaxH;
        cursorX = 0;
        rowMaxH = 0;
      }
      result.push({
        i: inst.id,
        x: cursorX,
        y: cursorY,
        w: wh.w,
        h: wh.h,
        minW: 1,
        maxW: 2,
        minH: 2,
        maxH: 4,
      });
      cursorX += wh.w;
      rowMaxH = Math.max(rowMaxH, wh.h);
      if (cursorX >= 2) {
        cursorY += rowMaxH;
        cursorX = 0;
        rowMaxH = 0;
      }
    }
    return result;
  }, [effectiveInstances]);

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

  // 拖拽结束：新 layout → 反推 order
  const handleDragStop = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      const sorted = [...newLayout].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
      const newOrder = sorted.map((l) => l.i);
      const oldOrder = [...effectiveInstances]
        .sort((a, b) => a.order - b.order)
        .map((i) => i.id);
      const changed =
        newOrder.length !== oldOrder.length ||
        newOrder.some((id, i) => id !== oldOrder[i]);
      if (changed) {
        void reorderInstances(newOrder);
      }
    },
    [effectiveInstances, reorderInstances],
  );

  // resize 结束：新 {w,h} → 反推 size
  const handleResizeStop = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      // 稳定 id 键的重复查找改用 Map 索引（react-doctor/js-index-maps）
      const byId = new Map(effectiveInstances.map((i) => [i.id, i] as const));
      for (const item of newLayout) {
        const key = `${item.w}-${item.h}`;
        const newSize = WH_TO_SIZE[key];
        if (!newSize) continue;
        const inst = byId.get(item.i);
        if (inst && inst.size !== newSize) {
          void setInstanceSize(inst.id, newSize);
        }
      }
    },
    [effectiveInstances, setInstanceSize],
  );

  // 进入编辑模式（右键菜单"编辑"项触发）
  const enterEditMode = useCallback(() => {
    window.dispatchEvent(new CustomEvent('edit-mode-change', { detail: true }));
  }, []);

  const renderWidget = (
    inst: WidgetInstance,
    size: WidgetSize,
    inEditMode: boolean,
  ) => {
    switch (inst.widgetKey) {
      case 'nas-status':
        return (
          <NasStatus
            status={dockerStats.status}
            available={dockerStats.available}
            size={size}
          />
        );
      case 'resource-gauge':
        return (
          <ResourceGauge
            resource={dockerStats.resource}
            available={dockerStats.available}
            size={size}
          />
        );
      case 'countdown':
        return (
          <CountdownWidget
            instanceId={inst.id}
            size={size}
            inEditMode={inEditMode}
          />
        );
      case 'countup':
        return (
          <CountupWidget
            instanceId={inst.id}
            size={size}
            inEditMode={inEditMode}
          />
        );
    }
  };

  // 右键菜单 items 生成
  const getWidgetMenuItems = (inst: WidgetInstance) => [
    {
      label: '编辑',
      icon: <Pencil size={14} />,
      onClick: enterEditMode,
    },
    { type: 'divider' as const },
    {
      label: '小',
      ...(inst.size === 'S' ? { icon: <Check size={14} /> } : {}),
      onClick: () => void setInstanceSize(inst.id, 'S'),
    },
    {
      label: '中',
      ...(inst.size === 'M' ? { icon: <Check size={14} /> } : {}),
      onClick: () => void setInstanceSize(inst.id, 'M'),
    },
    {
      label: '大',
      ...(inst.size === 'L' ? { icon: <Check size={14} /> } : {}),
      onClick: () => void setInstanceSize(inst.id, 'L'),
    },
    { type: 'divider' as const },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      onClick: () => handleRemove(inst.id),
    },
  ];

  const configPopover = (
    <Popover
      isOpen={configOpen}
      onOpenChange={setConfigOpen}
      placement="below"
      alignment="end"
      width={360}
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
        <div ref={containerRef} className="widget-grid-wrap relative">
          {mounted && (
            <ResponsiveGridLayout
              className="layout"
              width={width}
              layouts={{ lg: layout }}
              cols={{ lg: 2, md: 2, sm: 2, xs: 2, xxs: 2 }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              rowHeight={ROW_HEIGHT}
              margin={MARGIN}
              containerPadding={[0, 0]}
              compactor={verticalCompactor}
              dragConfig={{
                enabled: isEditMode,
                handle: '.widget-drag-handle',
                cancel: '.widget-no-drag',
                bounded: false,
                threshold: 8,
              }}
              resizeConfig={{
                enabled: isEditMode,
                handles: ['se'],
              }}
              onDragStop={handleDragStop}
              onResizeStop={handleResizeStop}
            >
              {effectiveInstances.map((inst) => (
                <div
                  key={inst.id}
                  className={`relative widget-cell ${isEditMode ? 'is-editing' : ''}`}
                >
                  {/* 拖拽手柄层（编辑态覆盖整个 widget） */}
                  {isEditMode && (
                    <div className="widget-drag-handle absolute inset-0 z-10" />
                  )}
                  {/* widget 内容 + 右键菜单 */}
                  <WidgetContextMenu items={getWidgetMenuItems(inst)}>
                    <div className="relative h-full w-full overflow-hidden rounded-[18px]">
                      {renderWidget(inst, inst.size, isEditMode)}
                    </div>
                  </WidgetContextMenu>
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
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

      <WidgetLibrary
        isOpen={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={async (key) => {
          setLibraryOpen(false);
          await addInstance(key);
          // 添加后自动进入编辑模式
          window.dispatchEvent(
            new CustomEvent('edit-mode-change', { detail: true }),
          );
        }}
      />
    </VStack>
  );
}
