import {describe, it, expect} from 'vitest';
import {
  daysBetween,
  daysUntil,
  daysSince,
  formatDate,
  formatDateShort,
} from './date';

describe('daysBetween', () => {
  it('同一天返回 0', () => {
    const a = new Date(2026, 0, 15);
    const b = new Date(2026, 0, 15);
    expect(daysBetween(a, b)).toBe(0);
  });

  it('相邻日期差 1', () => {
    const a = new Date(2026, 0, 15);
    const b = new Date(2026, 0, 16);
    expect(daysBetween(a, b)).toBe(1);
  });

  it('忽略时分秒，只算到日', () => {
    const a = new Date(2026, 0, 15, 23, 59, 59);
    const b = new Date(2026, 0, 16, 0, 0, 0);
    expect(daysBetween(a, b)).toBe(1);
  });

  it('过去日期返回负数', () => {
    const a = new Date(2026, 0, 16);
    const b = new Date(2026, 0, 15);
    expect(daysBetween(a, b)).toBe(-1);
  });

  it('跨月计算', () => {
    const a = new Date(2026, 0, 31);
    const b = new Date(2026, 1, 1);
    expect(daysBetween(a, b)).toBe(1);
  });

  it('跨年计算', () => {
    const a = new Date(2025, 11, 31);
    const b = new Date(2026, 0, 1);
    expect(daysBetween(a, b)).toBe(1);
  });
});

describe('daysUntil', () => {
  it('未来日期返回正数', () => {
    const now = new Date(2026, 0, 1);
    const target = new Date(2026, 0, 10);
    const result = daysUntil(target, now);
    expect(result.days).toBe(9);
    expect(result.isFuture).toBe(true);
  });

  it('当天返回 0', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);
    const target = new Date(2026, 0, 15, 0, 0, 0);
    const result = daysUntil(target, now);
    expect(result.days).toBe(0);
    expect(result.isFuture).toBe(true);
  });

  it('过去的非循环日期推到今年', () => {
    const now = new Date(2026, 6, 1); // 2026-07-01
    const target = new Date(2025, 0, 1); // 2025-01-01
    const result = daysUntil(target, now);
    // 推到 2026-01-01，已过期，再推到 2027-01-01
    expect(result.nextDate.getFullYear()).toBe(2027);
    expect(result.days).toBeGreaterThan(0);
    expect(result.isFuture).toBe(true);
  });

  it('过去的日期今年还没到时推到今年', () => {
    const now = new Date(2026, 0, 5); // 2026-01-05
    const target = new Date(2025, 5, 1); // 6月1日
    const result = daysUntil(target, now);
    expect(result.nextDate.getFullYear()).toBe(2026);
    expect(result.nextDate.getMonth()).toBe(5);
    expect(result.nextDate.getDate()).toBe(1);
    expect(result.days).toBeGreaterThan(0);
  });
});

describe('daysSince', () => {
  it('返回从起始日期到现在的天数', () => {
    const start = new Date(2026, 0, 1);
    const now = new Date(2026, 0, 11);
    expect(daysSince(start, now)).toBe(10);
  });

  it('起始日期在未来时返回负数', () => {
    const start = new Date(2026, 0, 11);
    const now = new Date(2026, 0, 1);
    expect(daysSince(start, now)).toBe(-10);
  });
});

describe('formatDate', () => {
  it('格式化为 YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('补零', () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('formatDateShort', () => {
  it('格式化为 M月D日', () => {
    expect(formatDateShort(new Date(2026, 0, 5))).toBe('1月5日');
    expect(formatDateShort(new Date(2026, 11, 31))).toBe('12月31日');
  });

  it('不补零', () => {
    expect(formatDateShort(new Date(2026, 0, 1))).toBe('1月1日');
  });
});
