import type { LayoutItem } from 'react-grid-layout';
import type { WidgetInstance, WidgetSize } from '@/types';

export const WIDGET_GRID_COLUMNS = 2;
export const WIDGET_GRID_MARGIN_X = 8;
// 底部双列模式下，当前 4 种 widget 在 256px 左右的单卡宽度仍可稳定展示；
// 继续沿用 280px 会把 560~590px 这段本可双列的视窗误杀成单列。
export const WIDGET_GRID_MIN_COLUMN_WIDTH = 256;
export const WIDGET_GRID_MODE_SWITCH_BUFFER = 12;
export const WIDGET_GRID_MIN_TWO_COLUMN_WIDTH =
  WIDGET_GRID_COLUMNS * WIDGET_GRID_MIN_COLUMN_WIDTH +
  WIDGET_GRID_MARGIN_X * (WIDGET_GRID_COLUMNS - 1);

export const SIZE_TO_WH: Record<WidgetSize, { w: number; h: number }> = {
  S: { w: 1, h: 2 },
  M: { w: 1, h: 4 },
  L: { w: 2, h: 4 },
};

export function shouldForceSingleColumnLayout(containerWidth: number) {
  return containerWidth < WIDGET_GRID_MIN_TWO_COLUMN_WIDTH;
}

export function resolveSingleColumnLayout(
  containerWidth: number,
  previousForceSingleColumn?: boolean,
) {
  if (previousForceSingleColumn === true) {
    return (
      containerWidth <
      WIDGET_GRID_MIN_TWO_COLUMN_WIDTH + WIDGET_GRID_MODE_SWITCH_BUFFER
    );
  }

  if (previousForceSingleColumn === false) {
    return (
      containerWidth <
      WIDGET_GRID_MIN_TWO_COLUMN_WIDTH - WIDGET_GRID_MODE_SWITCH_BUFFER
    );
  }

  return shouldForceSingleColumnLayout(containerWidth);
}

export function buildWidgetLayout(
  instances: WidgetInstance[],
  forceSingleColumn: boolean,
) {
  const sorted = [...instances].sort((a, b) => a.order - b.order);
  const result: LayoutItem[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowMaxH = 0;

  for (const inst of sorted) {
    const wh = SIZE_TO_WH[inst.size];
    const w = forceSingleColumn ? WIDGET_GRID_COLUMNS : wh.w;
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
