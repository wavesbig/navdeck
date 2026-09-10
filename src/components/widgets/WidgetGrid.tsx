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
import { DATE_ITEM_WIDGET_KEYS } from '@/lib/widgets/registry';
import { type DockerStats, widgetsApi } from '@/services/widgets';
import type { DateItemWidgetKey, WidgetInstance, WidgetSize } from '@/types';
import { WIDGET_RENDERERS } from './registry';
import {
  buildWidgetLayout,
  resolveLayoutMode,
  WIDGET_GRID_COLUMNS,
  WIDGET_GRID_MARGIN_X,
  type WidgetLayoutMode,
} from './widget-grid-layout';

const WH_TO_SIZE: Record<string, WidgetSize> = {
  '1-2': 'S',
  '1-4': 'M',
  '2-4': 'L',
};

// 44px 基准行高（根字号 16px）：S 卡 96px / M·L 卡 200px。
// widget 内容全部按 rem 排版，行高必须随根字号等比缩放，
// 否则 125%/150% 字号偏好下固定卡高装不下放大后的内容，
// M·L 卡会真实截断（如 NAS L 截 30px）。
const ROW_HEIGHT = 44;
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
      {DATE_ITEM_WIDGET_KEYS.includes(inst.widgetKey as DateItemWidgetKey) && (
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

  // 列数模式只信容器实测宽（4 / 2 / 1 列，见 resolveLayoutMode），
  // 不引入视口断点：容器和视口之间隔着 AppShell 内边距与滚动条，
  // 混用两套阈值会出现「容器已放不下 4 列、视口却仍判宽」的挤压带。
  //
  // 为什么不用 ResponsiveGridLayout：响应式包装层的断点记账（内部
  // layouts 映射）会因 matchMedia 先于 ResizeObserver 触发而写进
  // 过期宽度，回大屏后被永久钳在旧布局。plain GridLayout 没有
  // 断点状态机，layout prop 是唯一事实来源，从根上消除该路径。
  const [layoutMode, setLayoutMode] = useState<WidgetLayoutMode | null>(null);

  const { data: dockerData } = useSWR(
    widgetsApi.dockerKey,
    widgetsApi.getDockerStats,
    // Docker 状态变化靠轮询发现；5 秒足够接近实时且不会压垮 Docker socket
    { refreshInterval: 5_000 },
  );
  const dockerStats = dockerData ?? INITIAL_DOCKER_STATS;

  // 列数判定必须等测宽（mounted）后再做：若用 hook 首轮的过期宽度
  // （默认 1280）先渲染、下一轮再翻列数，RGL 会把这次翻转账播成
  // 开页飞入。layoutMode 落定前不渲染网格，保证首帧就是最终布局。
  useEffect(() => {
    if (!mounted) return;
    setLayoutMode((previous) =>
      resolveLayoutMode(width, previous ?? undefined),
    );
  }, [mounted, width]);

  // instances → RGL layout（按列数 bin-packing）
  const layout = useMemo<LayoutItem[]>(
    () => buildWidgetLayout(instances, layoutMode ?? 'four'),
    [instances, layoutMode],
  );

  // 行高随根字号缩放；网格 mounted 后才渲染，首帧即是最终值。
  // 字号偏好设置页与主页不同路由，返回主页时组件重挂载会重算。
  const [rowHeight, setRowHeight] = useState(ROW_HEIGHT);

  useEffect(() => {
    if (!mounted) return;
    const rootFont = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    if (Number.isFinite(rootFont) && rootFont > 0) {
      setRowHeight((ROW_HEIGHT * rootFont) / 16);
    }
  }, [mounted]);

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
      className="widget-grid-wrap relative min-h-[44px] rounded-panel transition-colors"
    >
      {mounted && layoutMode && (
        <GridLayout
          className="layout"
          width={width}
          layout={layout}
          gridConfig={{
            cols: WIDGET_GRID_COLUMNS,
            rowHeight,
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
            // 仅 4 列模式下 w/h 与 S/M/L 一一对应；2/1 列下拖拽产物
            // 无法反推尺寸档位，调尺寸走右键菜单
            enabled: isEditMode && layoutMode === 'four',
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
                  {WIDGET_RENDERERS[inst.widgetKey]({
                    instance: inst,
                    // 真单列（连 2 列都放不下）铺满时 M/L 内容切到更宽松
                    // 的详细版；4/2 列模式保留实例原始密度
                    size:
                      layoutMode === 'one' && inst.size !== 'S'
                        ? 'L'
                        : inst.size,
                    inEditMode: isEditMode,
                    dockerStats,
                  })}
                </div>
              </WidgetContextMenu>
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
