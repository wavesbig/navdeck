import { describe, expect, it } from 'vitest';
import type { WidgetInstance } from '@/types';
import {
  buildWidgetLayout,
  resolveSingleColumnLayout,
  shouldForceSingleColumnLayout,
  WIDGET_GRID_SINGLE_COLUMN_MAX_VIEWPORT,
  WIDGET_GRID_STRIP_MIN_WIDTH,
} from './widget-grid-layout';

function createInstance(
  id: string,
  order: number,
  size: WidgetInstance['size'],
): WidgetInstance {
  return {
    id,
    widgetKey: 'nas-status',
    order,
    size,
  };
}

describe('widget-grid-layout', () => {
  it('仅在宽度低于 4 列横条最小值时退化为单列', () => {
    expect(shouldForceSingleColumnLayout(WIDGET_GRID_STRIP_MIN_WIDTH - 1)).toBe(
      true,
    );
    expect(shouldForceSingleColumnLayout(WIDGET_GRID_STRIP_MIN_WIDTH)).toBe(
      false,
    );
  });

  it('暴露给 matchMedia 的视口断点与容器最小宽一致', () => {
    expect(WIDGET_GRID_SINGLE_COLUMN_MAX_VIEWPORT).toBe(1047);
  });

  it('在临界宽度附近保留列数切换滞回区', () => {
    expect(resolveSingleColumnLayout(1059, true)).toBe(true);
    expect(resolveSingleColumnLayout(1060, true)).toBe(false);
    expect(resolveSingleColumnLayout(1036, false)).toBe(false);
    expect(resolveSingleColumnLayout(1035, false)).toBe(true);
  });

  it('4 列横条按顺序排列小卡', () => {
    const layout = buildWidgetLayout(
      [
        createInstance('a', 0, 'S'),
        createInstance('b', 1, 'S'),
        createInstance('c', 2, 'S'),
        createInstance('d', 3, 'S'),
      ],
      false,
    );

    expect(layout).toMatchObject([
      { i: 'a', x: 0, y: 0, w: 1, h: 2, maxW: 4 },
      { i: 'b', x: 1, y: 0, w: 1, h: 2, maxW: 4 },
      { i: 'c', x: 2, y: 0, w: 1, h: 2, maxW: 4 },
      { i: 'd', x: 3, y: 0, w: 1, h: 2, maxW: 4 },
    ]);
  });

  it('大卡占用两列，小卡继续填充同行', () => {
    const layout = buildWidgetLayout(
      [
        createInstance('a', 0, 'L'),
        createInstance('b', 1, 'S'),
        createInstance('c', 2, 'S'),
      ],
      false,
    );

    expect(layout).toMatchObject([
      { i: 'a', x: 0, y: 0, w: 2, h: 4 },
      { i: 'b', x: 2, y: 0, w: 1, h: 2 },
      { i: 'c', x: 3, y: 0, w: 1, h: 2 },
    ]);
  });

  it('窄屏退化时让所有卡片占满整行并顺序下排', () => {
    const layout = buildWidgetLayout(
      [createInstance('a', 0, 'S'), createInstance('b', 1, 'M')],
      true,
    );

    expect(layout).toMatchObject([
      { i: 'a', x: 0, y: 0, w: 4, h: 2 },
      { i: 'b', x: 0, y: 2, w: 4, h: 4 },
    ]);
  });
});
