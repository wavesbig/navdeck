import type { LayoutItem } from 'react-grid-layout';
import type { WidgetInstance, WidgetSize } from '@/types';

export const WIDGET_GRID_COLUMNS = 4;
export const WIDGET_GRID_MARGIN_X = 8;
// 每列至少保留 256px，4 列横条低于该总宽时退化为单列。
const WIDGET_GRID_MIN_COLUMN_WIDTH = 256;
const WIDGET_GRID_MODE_SWITCH_BUFFER = 12;
export const WIDGET_GRID_STRIP_MIN_WIDTH =
  WIDGET_GRID_COLUMNS * WIDGET_GRID_MIN_COLUMN_WIDTH +
  WIDGET_GRID_MARGIN_X * (WIDGET_GRID_COLUMNS - 1);
export const WIDGET_GRID_SINGLE_COLUMN_MAX_VIEWPORT =
  WIDGET_GRID_STRIP_MIN_WIDTH - 1;

const SIZE_TO_WH: Record<WidgetSize, { w: number; h: number }> = {
  S: { w: 1, h: 2 },
  M: { w: 1, h: 4 },
  L: { w: 2, h: 4 },
};

export function shouldForceSingleColumnLayout(containerWidth: number) {
  return containerWidth < WIDGET_GRID_STRIP_MIN_WIDTH;
}

export function resolveSingleColumnLayout(
  containerWidth: number,
  previousForceSingleColumn?: boolean,
) {
  if (previousForceSingleColumn === true) {
    return (
      containerWidth <
      WIDGET_GRID_STRIP_MIN_WIDTH + WIDGET_GRID_MODE_SWITCH_BUFFER
    );
  }

  if (previousForceSingleColumn === false) {
    return (
      containerWidth <
      WIDGET_GRID_STRIP_MIN_WIDTH - WIDGET_GRID_MODE_SWITCH_BUFFER
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
