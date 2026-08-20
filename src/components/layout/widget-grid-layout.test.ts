import { describe, expect, it } from 'vitest';
import type { WidgetInstance } from '@/types';
import {
  buildWidgetLayout,
  resolveSingleColumnLayout,
  shouldForceSingleColumnLayout,
  WIDGET_GRID_COLUMNS,
  WIDGET_GRID_MARGIN_X,
  WIDGET_GRID_MIN_TWO_COLUMN_WIDTH,
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
  it('仅在可用宽度低于双列最小值时退化为单列', () => {
    expect(
      shouldForceSingleColumnLayout(WIDGET_GRID_MIN_TWO_COLUMN_WIDTH - 1),
    ).toBe(true);
    expect(
      shouldForceSingleColumnLayout(WIDGET_GRID_MIN_TWO_COLUMN_WIDTH),
    ).toBe(false);
  });

  it('为窄平板保留 260px 左右的双列空间', () => {
    expect(shouldForceSingleColumnLayout(528)).toBe(false);
    expect(shouldForceSingleColumnLayout(520)).toBe(false);
    expect(shouldForceSingleColumnLayout(519)).toBe(true);
  });

  it('在临界宽度附近保留列数切换滞回区', () => {
    expect(resolveSingleColumnLayout(530, true)).toBe(true);
    expect(resolveSingleColumnLayout(532, true)).toBe(false);
    expect(resolveSingleColumnLayout(510, false)).toBe(false);
    expect(resolveSingleColumnLayout(507, false)).toBe(true);
  });

  it('双列空间足够时保留半宽卡片并排布局', () => {
    const layout = buildWidgetLayout(
      [createInstance('a', 0, 'M'), createInstance('b', 1, 'M')],
      false,
    );

    expect(layout).toMatchObject([
      { i: 'a', x: 0, y: 0, w: 1, h: 4 },
      { i: 'b', x: 1, y: 0, w: 1, h: 4 },
    ]);
  });

  it('单列退化时让所有卡片占满整行并顺序下排', () => {
    const layout = buildWidgetLayout(
      [createInstance('a', 0, 'S'), createInstance('b', 1, 'M')],
      true,
    );

    expect(layout).toMatchObject([
      { i: 'a', x: 0, y: 0, w: 2, h: 2 },
      { i: 'b', x: 0, y: 2, w: 2, h: 4 },
    ]);
  });

  it('大卡在双列模式下独占一行后继续排后续卡片', () => {
    const layout = buildWidgetLayout(
      [createInstance('a', 0, 'L'), createInstance('b', 1, 'S')],
      false,
    );

    expect(layout).toMatchObject([
      { i: 'a', x: 0, y: 0, w: 2, h: 4 },
      { i: 'b', x: 0, y: 4, w: 1, h: 2 },
    ]);
  });

  it('固化当前接受的 400/480px 桌面双列宽度预算', () => {
    const cellWidth = (barWidth: number) =>
      (barWidth - WIDGET_GRID_MARGIN_X * (WIDGET_GRID_COLUMNS - 1)) /
      WIDGET_GRID_COLUMNS;

    expect(cellWidth(400)).toBe(196);
    expect(cellWidth(480)).toBe(236);
  });
});
