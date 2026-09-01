import { describe, expect, it } from 'vitest';
import { estimateMetricUnits, getHeroMetricClass } from './DateWidgetDisplay';

describe('estimateMetricUnits', () => {
  it('CJK 记 1 全宽，数字/字母记 0.6', () => {
    expect(estimateMetricUnits('27天')).toBeCloseTo(2.2);
    expect(estimateMetricUnits('0年0个月27天')).toBeCloseTo(6.4);
  });
});

describe('getHeroMetricClass（S 档长值降档）', () => {
  const size = 'S';

  it('短值维持原字号与容器升级', () => {
    expect(getHeroMetricClass(size, '27天')).toBe(
      'text-3xl @md:text-6xl @lg:text-7xl',
    );
    expect(getHeroMetricClass(size, '100天')).toBe(
      'text-3xl @md:text-5xl @lg:text-6xl',
    );
  });

  it('年/月长档位值逐级降字号且不再升级', () => {
    expect(getHeroMetricClass(size, '11个月')).toBe('text-2xl @md:text-3xl');
    expect(getHeroMetricClass(size, '0年0个月')).toBe('text-xl');
    expect(getHeroMetricClass(size, '0年0个月27天')).toBe('text-lg');
  });
});

describe('getHeroMetricClass（M/L 档保持原逻辑）', () => {
  it('M 档短值走长度阈值', () => {
    expect(getHeroMetricClass('M', '27天')).toBe(
      'text-5xl @md:text-6xl @lg:text-7xl',
    );
    expect(getHeroMetricClass('L', '27天')).toBe(
      'text-6xl @md:text-6xl @lg:text-7xl',
    );
  });
});
