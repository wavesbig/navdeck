import type { WidgetSize } from '@/types';

export function getHeroValueSize(size: WidgetSize) {
  switch (size) {
    case 'S':
      return 'text-3xl';
    case 'M':
      return 'text-5xl';
    case 'L':
      return 'text-6xl';
    default:
      return 'text-5xl';
  }
}

/**
 * 估算点阵字宽：CJK 记 1 个全宽，数字/字母记 0.6。
 * 用于 S 档在年/月等长档位值下自动降字号，杜绝换行撑破卡片。
 */
export function estimateMetricUnits(value: string) {
  let units = 0;
  for (const char of value) {
    units += /[\u2E80-\u9FFF\uF900-\uFAFF\uFF01-\uFF60]/.test(char) ? 1 : 0.6;
  }
  return units;
}

export function getHeroMetricClass(size: WidgetSize, valueLabel: string) {
  // 按点阵字宽估宽选字号：年/月等长档位值降档单行放下，
  // 数值永不换行/溢出（溢出兜底由 max-width + ellipsis 承担）
  const units = estimateMetricUnits(valueLabel);

  if (units <= 2.2) {
    return `${getHeroValueSize(size)} @md:text-6xl @lg:text-7xl`;
  }
  if (units <= 3) {
    return `${getHeroValueSize(size)} @md:text-5xl @lg:text-6xl`;
  }
  if (units <= 3.8) {
    if (size === 'S') return 'text-2xl @md:text-3xl';
    if (size === 'M') return 'text-3xl @md:text-4xl';
    return 'text-3xl @lg:text-4xl';
  }
  if (units <= 5) {
    if (size === 'S') return 'text-xl';
    return 'text-2xl @md:text-3xl';
  }
  if (size === 'S') return 'text-lg';
  return 'text-xl';
}
