import type { LayoutItem } from 'react-grid-layout';
import type { WidgetInstance, WidgetSize } from '@/types';

export const WIDGET_GRID_COLUMNS = 4;
export const WIDGET_GRID_MARGIN_X = 8;
// 每列至少保留 256px：容器低于 4 列总宽先降 2 列，低于 2 列总宽再降单列。
const WIDGET_GRID_MIN_COLUMN_WIDTH = 256;
// 列数切换滞回：临界宽度附近测宽抖动时避免反复重排。
const WIDGET_GRID_MODE_SWITCH_BUFFER = 12;

export const WIDGET_GRID_FOUR_COLUMN_MIN_WIDTH =
  WIDGET_GRID_COLUMNS * WIDGET_GRID_MIN_COLUMN_WIDTH +
  WIDGET_GRID_MARGIN_X * (WIDGET_GRID_COLUMNS - 1);

export const WIDGET_GRID_TWO_COLUMN_MIN_WIDTH =
  2 * WIDGET_GRID_MIN_COLUMN_WIDTH + WIDGET_GRID_MARGIN_X;

export type WidgetLayoutMode = 'four' | 'two' | 'one';

const SIZE_TO_WH: Record<WidgetSize, { w: number; h: number }> = {
  S: { w: 1, h: 2 },
  M: { w: 1, h: 4 },
  L: { w: 2, h: 4 },
};

/** 每档尺寸在当前列数模式下占的列宽（网格恒为 4 列） */
function spanFor(size: WidgetSize, mode: WidgetLayoutMode) {
  if (mode === 'one') return WIDGET_GRID_COLUMNS;
  if (mode === 'two') return size === 'L' ? WIDGET_GRID_COLUMNS : 2;
  return size === 'L' ? 2 : 1;
}

/**
 * 按容器实测宽解析列数模式（4 / 2 / 1 列），带切换滞回。
 *
 * 只信容器宽，不引入视口断点：容器和视口之间隔着 AppShell
 * 内边距与滚动条，两套阈值混用会出现「容器已放不下 4 列、
 * 视口却仍判宽」的挤压带。
 */
export function resolveLayoutMode(
  containerWidth: number,
  previous?: WidgetLayoutMode,
): WidgetLayoutMode {
  const fourMin = WIDGET_GRID_FOUR_COLUMN_MIN_WIDTH;
  const twoMin = WIDGET_GRID_TWO_COLUMN_MIN_WIDTH;
  const buffer = WIDGET_GRID_MODE_SWITCH_BUFFER;

  switch (previous) {
    case 'four':
      if (containerWidth >= fourMin - buffer) return 'four';
      return containerWidth >= twoMin + buffer ? 'two' : 'one';
    case 'two':
      if (containerWidth >= fourMin + buffer) return 'four';
      return containerWidth >= twoMin - buffer ? 'two' : 'one';
    case 'one':
      if (containerWidth >= fourMin + buffer) return 'four';
      return containerWidth >= twoMin + buffer ? 'two' : 'one';
    default:
      return containerWidth >= fourMin
        ? 'four'
        : containerWidth >= twoMin
          ? 'two'
          : 'one';
  }
}

export function buildWidgetLayout(
  instances: WidgetInstance[],
  mode: WidgetLayoutMode,
) {
  const sorted = [...instances].sort((a, b) => a.order - b.order);
  const result: LayoutItem[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowMaxH = 0;

  for (const inst of sorted) {
    const wh = SIZE_TO_WH[inst.size];
    const w = spanFor(inst.size, mode);
    if (cursorX + w > WIDGET_GRID_COLUMNS) {
      cursorY += rowMaxH;
      cursorX = 0;
      rowMaxH = 0;
    }
    result.push({
      i: inst.id,
      x: cursorX,
      y: cursorY,
      w,
      h: wh.h,
      minW: 1,
      maxW: WIDGET_GRID_COLUMNS,
      minH: 2,
      maxH: 4,
    });
    cursorX += w;
    rowMaxH = Math.max(rowMaxH, wh.h);
    if (cursorX >= WIDGET_GRID_COLUMNS) {
      cursorY += rowMaxH;
      cursorX = 0;
      rowMaxH = 0;
    }
  }

  return result;
}
