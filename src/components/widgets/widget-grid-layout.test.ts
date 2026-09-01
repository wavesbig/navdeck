import { describe, expect, it } from 'vitest';
import type { WidgetInstance } from '@/types';
import {
  buildWidgetLayout,
  resolveLayoutMode,
  WIDGET_GRID_FOUR_COLUMN_MIN_WIDTH,
  WIDGET_GRID_TWO_COLUMN_MIN_WIDTH,
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
  it('初始按容器宽判定 4 / 2 / 1 列', () => {
    expect(resolveLayoutMode(WIDGET_GRID_FOUR_COLUMN_MIN_WIDTH)).toBe('four');
    expect(resolveLayoutMode(WIDGET_GRID_FOUR_COLUMN_MIN_WIDTH - 1)).toBe(
      'two',
    );
    expect(resolveLayoutMode(WIDGET_GRID_TWO_COLUMN_MIN_WIDTH)).toBe('two');
    expect(resolveLayoutMode(WIDGET_GRID_TWO_COLUMN_MIN_WIDTH - 1)).toBe('one');
  });

  it('列数切换在临界宽度附近保留滞回', () => {
    expect(resolveLayoutMode(1036, 'four')).toBe('four');
    expect(resolveLayoutMode(1035, 'four')).toBe('two');
    expect(resolveLayoutMode(1059, 'two')).toBe('two');
    expect(resolveLayoutMode(1060, 'two')).toBe('four');
    expect(resolveLayoutMode(509, 'two')).toBe('two');
    expect(resolveLayoutMode(507, 'two')).toBe('one');
    expect(resolveLayoutMode(531, 'one')).toBe('one');
    expect(resolveLayoutMode(532, 'one')).toBe('two');
  });

  it('4 列横条按顺序排列小卡', () => {
    const layout = buildWidgetLayout(
      [
        createInstance('a', 0, 'S'),
        createInstance('b', 1, 'S'),
        createInstance('c', 2, 'S'),
        createInstance('d', 3, 'S'),
      ],
      'four',
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
      'four',
    );

    expect(layout).toMatchObject([
      { i: 'a', x: 0, y: 0, w: 2, h: 4 },
      { i: 'b', x: 2, y: 0, w: 1, h: 2 },
      { i: 'c', x: 3, y: 0, w: 1, h: 2 },
    ]);
  });

  it('2 列模式下 S/M 占半行、L 占整行', () => {
    const layout = buildWidgetLayout(
      [
        createInstance('a', 0, 'S'),
        createInstance('b', 1, 'M'),
        createInstance('c', 2, 'L'),
      ],
      'two',
    );

    expect(layout).toMatchObject([
      { i: 'a', x: 0, y: 0, w: 2, h: 2 },
      { i: 'b', x: 2, y: 0, w: 2, h: 4 },
      { i: 'c', x: 0, y: 4, w: 4, h: 4 },
    ]);
  });

  it('单列退化时让所有卡片占满整行并顺序下排', () => {
    const layout = buildWidgetLayout(
      [createInstance('a', 0, 'S'), createInstance('b', 1, 'M')],
      'one',
    );

    expect(layout).toMatchObject([
      { i: 'a', x: 0, y: 0, w: 4, h: 2 },
      { i: 'b', x: 0, y: 2, w: 4, h: 4 },
    ]);
  });
});
