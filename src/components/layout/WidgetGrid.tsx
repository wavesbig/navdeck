'use client';

import { ContextMenu } from '@astryxdesign/core/ContextMenu';
import { Check, Pencil, Settings, Trash2 } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { type DockerStats, widgetsApi } from '@/services/widgets';
import type { WidgetInstance, WidgetSize } from '@/types';

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

/** 按 widgetKey 分发渲染具体 widget 内容 */
function renderWidgetContent(
  inst: WidgetInstance,
  size: WidgetSize,
  inEditMode: boolean,
  dockerStats: DockerStats,
) {
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
}

// 进入编辑模式（右键菜单「编辑」项触发）
function enterEditMode() {
  window.dispatchEvent(new CustomEvent('edit-mode-change', { detail: true }));
}

// 打开日期类 widget 的配置弹窗（widget 内部监听该事件）
function openWidgetConfig(instanceId: string) {
  window.dispatchEvent(
    new CustomEvent('widget-config-open', {
      detail: { instanceId },
    }),
  );
}

interface WidgetMenuCallbacks {
  onResize: (id: string, size: WidgetSize) => Promise<void>;
  onRemove: (id: string) => void;
}

// 右键菜单 items 生成
function getWidgetMenuItems(inst: WidgetInstance, cb: WidgetMenuCallbacks) {
  return [
    {
      label: '编辑',
      icon: <Pencil size={14} />,
      onClick: enterEditMode,
    },
    ...(inst.widgetKey === 'countdown' || inst.widgetKey === 'countup'
      ? [
          {
            label: '设置',
            icon: <Settings size={14} />,
            onClick: () => openWidgetConfig(inst.id),
          },
        ]
      : []),
    { type: 'divider' as const },
    {
      label: '小',
      ...(inst.size === 'S' ? { icon: <Check size={14} /> } : {}),
      onClick: () => void cb.onResize(inst.id, 'S'),
    },
    {
      label: '中',
      ...(inst.size === 'M' ? { icon: <Check size={14} /> } : {}),
      onClick: () => void cb.onResize(inst.id, 'M'),
    },
    {
      label: '大',
      ...(inst.size === 'L' ? { icon: <Check size={14} /> } : {}),
      onClick: () => void cb.onResize(inst.id, 'L'),
    },
    { type: 'divider' as const },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      onClick: () => cb.onRemove(inst.id),
    },
  ];
}

interface WidgetGridProps {
  instances: WidgetInstance[];
  isEditMode: boolean;
  onReorder: (ids: string[]) => Promise<void>;
  onResize: (id: string, size: WidgetSize) => Promise<void>;
  onRemove: (id: string) => void;
}

/**
 * Widget 网格区（react-grid-layout v2 驱动）
 *
 * 负责 docker 数据轮询、instances → layout 映射、拖拽/resize 回写、
 * 每个实例的右键菜单；栏级 chrome（标题/配置弹窗/添加流程）在 WidgetBar。
 */
export function WidgetGrid({
  instances,
  isEditMode,
  onReorder,
  onResize,
  onRemove,
}: WidgetGridProps) {
  // RGL v2：useContainerWidth 替代 WidthProvider HOC
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });

  const { data: dockerData } = useSWR(
    widgetsApi.dockerKey,
    widgetsApi.getDockerStats,
    { refreshInterval: 30_000 },
  );
  const dockerStats = dockerData ?? INITIAL_DOCKER_STATS;

  // instances → RGL layout（两列 bin-packing）
  const layout = useMemo<LayoutItem[]>(() => {
    const sorted = [...instances].sort((a, b) => a.order - b.order);
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
  }, [instances]);

  // 拖拽结束：新 layout → 反推 order
  const handleDragStop = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      const sorted = [...newLayout].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
      const newOrder = sorted.map((l) => l.i);
      const oldOrder = [...instances]
        .sort((a, b) => a.order - b.order)
        .map((i) => i.id);
      const changed =
        newOrder.length !== oldOrder.length ||
        newOrder.some((id, i) => id !== oldOrder[i]);
      if (changed) {
        void onReorder(newOrder);
      }
    },
    [instances, onReorder],
  );

  // resize 结束：新 {w,h} → 反推 size
  const handleResizeStop = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      // 稳定 id 键的重复查找改用 Map 索引（react-doctor/js-index-maps）
      const byId = new Map(instances.map((i) => [i.id, i] as const));
      for (const item of newLayout) {
        const key = `${item.w}-${item.h}`;
        const newSize = WH_TO_SIZE[key];
        if (!newSize) continue;
        const inst = byId.get(item.i);
        if (inst && inst.size !== newSize) {
          void onResize(inst.id, newSize);
        }
      }
    },
    [instances, onResize],
  );

  return (
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
          {instances.map((inst) => (
            <div
              key={inst.id}
              className={`relative widget-cell ${isEditMode ? 'is-editing' : ''}`}
            >
              {/* 拖拽手柄层（编辑态覆盖整个 widget） */}
              {isEditMode && (
                <div className="widget-drag-handle absolute inset-0 z-10" />
              )}
              {/* widget 内容 + 右键菜单 */}
              <WidgetContextMenu
                items={getWidgetMenuItems(inst, { onResize, onRemove })}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[18px]">
                  {renderWidgetContent(
                    inst,
                    inst.size,
                    isEditMode,
                    dockerStats,
                  )}
                </div>
              </WidgetContextMenu>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
