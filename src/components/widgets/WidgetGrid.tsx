'use client';

import {
  ContextMenu,
  ContextMenuDivider,
  ContextMenuItem,
} from '@astryxdesign/core/ContextMenu';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Pencil, Settings, Trash2 } from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  GridLayout,
  type LayoutItem,
  useContainerWidth,
  verticalCompactor,
} from 'react-grid-layout';
import useSWR from 'swr';
import { type DockerStats, widgetsApi } from '@/services/widgets';
import type { WidgetInstance, WidgetSize } from '@/types';
import { Countdown } from './Countdown';
import { Countup } from './Countup';
import { NasStatus } from './NasStatus';
import { ResourceGauge } from './ResourceGauge';
import {
  buildWidgetLayout,
  resolveSingleColumnLayout,
  WIDGET_GRID_COLUMNS,
  WIDGET_GRID_MARGIN_X,
  WIDGET_GRID_SINGLE_COLUMN_MAX_VIEWPORT,
} from './widget-grid-layout';

const WH_TO_SIZE: Record<string, WidgetSize> = {
  '1-2': 'S',
  '1-4': 'M',
  '2-4': 'L',
};

const ROW_HEIGHT = 40;
const MARGIN: [number, number] = [WIDGET_GRID_MARGIN_X, 8];

const INITIAL_DOCKER_STATS: DockerStats = {
  available: false,
  status: { running: 0, total: 0, stopped: 0, runningNames: [] },
  resource: {
    cpuPercent: 0,
    memoryPercent: 0,
    diskReadBytesPerSec: 0,
    diskWriteBytesPerSec: 0,
  },
  engine: { images: 0, serverVersion: '', cpus: 0, memTotalBytes: 0 },
};

/**
 * ContextMenu 包裹器：强制 trigger wrapper 填满父容器
 *
 * Astryx ContextMenu 的 trigger wrapper 默认无 height/width，
 * 在 commit 阶段的 ref callback 中设为 100%，使 widget 内容能正确填充
 * RGL grid item，同时避免渲染期修改 ref。
 */
function WidgetContextMenu({
  menuContent,
  children,
}: {
  menuContent: ReactNode;
  children: ReactNode;
}) {
  const fillContextMenuTrigger = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    node.style.height = '100%';
    node.style.width = '100%';
  }, []);
  return (
    <ContextMenu
      ref={fillContextMenuTrigger}
      menuContent={menuContent}
      menuWidth={184}
      size="sm"
    >
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
          engine={dockerStats.engine}
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
        <Countdown instanceId={inst.id} size={size} inEditMode={inEditMode} />
      );
    case 'countup':
      return (
        <Countup instanceId={inst.id} size={size} inEditMode={inEditMode} />
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

const WIDGET_SIZES: Array<{ value: WidgetSize; label: string }> = [
  { value: 'S', label: '小' },
  { value: 'M', label: '中' },
  { value: 'L', label: '大' },
];

// 菜单内保留 segmented 视觉，但使用 menuitemradio 保证上下键可达
function WidgetSizeMenuControl({
  inst,
  onResize,
}: {
  inst: WidgetInstance;
  onResize: WidgetMenuCallbacks['onResize'];
}) {
  return (
    <VStack gap={1} className="px-2 pt-1 pb-1">
      <Text type="supporting" className="text-eyebrow">
        尺寸
      </Text>
      <HStack
        gap={0.5}
        width="100%"
        role="group"
        aria-label="Widget 尺寸"
        className="rounded-control bg-neutral p-1"
      >
        {WIDGET_SIZES.map(({ value, label }) => {
          const isSelected = inst.size === value;
          return (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={isSelected}
              tabIndex={-1}
              onClick={() => {
                if (!isSelected) {
                  void onResize(inst.id, value);
                }
              }}
              className={`flex-1 rounded-control px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isSelected
                  ? 'bg-surface font-semibold text-primary shadow-sm'
                  : 'font-medium text-primary hover:bg-overlay-hover'
              }`}
            >
              {label}
            </button>
          );
        })}
      </HStack>
    </VStack>
  );
}

// 右键菜单：尺寸是一组状态选项，用紧凑 segmented control 直接嵌入菜单
function getWidgetMenuContent(inst: WidgetInstance, cb: WidgetMenuCallbacks) {
  return (
    <>
      <ContextMenuItem
        icon={<Pencil size={14} />}
        label="编辑布局"
        onClick={enterEditMode}
      />
      {(inst.widgetKey === 'countdown' || inst.widgetKey === 'countup') && (
        <ContextMenuItem
          icon={<Settings size={14} />}
          label="设置"
          onClick={() => openWidgetConfig(inst.id)}
        />
      )}
      <ContextMenuDivider />
      <WidgetSizeMenuControl inst={inst} onResize={cb.onResize} />
      <ContextMenuDivider />
      <ContextMenuItem
        icon={<Trash2 size={14} />}
        label="删除"
        variant="destructive"
        onClick={() => cb.onRemove(inst.id)}
      />
    </>
  );
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

  // 窄屏模式（低于 4 列横条最小宽度）：
  // 只在实际可用宽度不足时把 item span 拉满。
  //
  // 为什么不用 ResponsiveGridLayout：列数本来就恒定，响应式包装层的
  // 断点记账（内部 layouts 映射）反而引入缺陷——视口穿越断点时
  // matchMedia 先于 ResizeObserver 触发，过期容器宽度会把单列布局
  // 写进 RGL 内部 layouts[breakpoint]，回大屏时 RGL 优先复用这份
  // 过期缓存而非 props，widget 被永久钳成单列。plain GridLayout 没有
  // 断点状态机，layout prop 是唯一事实来源，从根上消除该路径。
  const [isBottomLayout, setIsBottomLayout] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(
      `(max-width: ${WIDGET_GRID_SINGLE_COLUMN_MAX_VIEWPORT}px)`,
    );
    const sync = () => setIsBottomLayout(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const { data: dockerData } = useSWR(
    widgetsApi.dockerKey,
    widgetsApi.getDockerStats,
    { refreshInterval: 30_000 },
  );
  const dockerStats = dockerData ?? INITIAL_DOCKER_STATS;

  // 底部模式按实际容器宽度决定是否退化成单列。
  // 为避免临界宽度附近因测宽抖动/滚动条槽位变化来回翻列数，
  // 在单列/4 列之间保留一小段滞回区。
  const [forceSingleColumn, setForceSingleColumn] = useState(false);
  useEffect(() => {
    if (!isBottomLayout) {
      setForceSingleColumn(false);
      return;
    }
    setForceSingleColumn((previous) =>
      resolveSingleColumnLayout(width, previous),
    );
  }, [isBottomLayout, width]);

  // instances → RGL layout（按列数 bin-packing）
  const layout = useMemo<LayoutItem[]>(
    () => buildWidgetLayout(instances, forceSingleColumn),
    [instances, forceSingleColumn],
  );

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
    <div
      ref={containerRef}
      className="widget-grid-wrap relative min-h-[40px] rounded-panel transition-colors"
    >
      {mounted && (
        <GridLayout
          className="layout"
          width={width}
          layout={layout}
          gridConfig={{
            cols: WIDGET_GRID_COLUMNS,
            rowHeight: ROW_HEIGHT,
            margin: MARGIN,
            containerPadding: [0, 0],
          }}
          compactor={verticalCompactor}
          dragConfig={{
            enabled: isEditMode,
            handle: '.widget-drag-handle',
            cancel: '.widget-no-drag',
            bounded: false,
            threshold: 8,
          }}
          resizeConfig={{
            // 单列铺满时宽度恒为 100%，角标拖拽无意义（尺寸仍可走右键菜单）
            enabled: isEditMode && !forceSingleColumn,
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
                menuContent={getWidgetMenuContent(inst, { onResize, onRemove })}
              >
                {/* @container：widget 内部用容器查询做响应式（字档/间距随单元格宽度流式变化） */}
                <div className="@container relative h-full w-full overflow-hidden rounded-[18px]">
                  {renderWidgetContent(
                    inst,
                    // 单列铺满时内容切到更宽松的详细版；双列时保留实例原始密度
                    forceSingleColumn && inst.size !== 'S' ? 'L' : inst.size,
                    isEditMode,
                    dockerStats,
                  )}
                </div>
              </WidgetContextMenu>
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
