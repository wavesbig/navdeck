import { describe, expect, it } from 'vitest';
import { formatClockDate, formatClockTime, getClockGreeting } from './time';

describe('home clock formatting', () => {
  it('格式化 24 小时制时间', () => {
    expect(formatClockTime(new Date(2026, 7, 20, 9, 5))).toBe('09:05');
    expect(formatClockTime(new Date(2026, 7, 20, 16, 36))).toBe('16:36');
  });

  it('格式化中文日期和星期', () => {
    expect(formatClockDate(new Date(2026, 7, 20, 16, 36))).toBe('8月20日 周四');
  });

  it('按小时返回问候语', () => {
    expect(getClockGreeting(new Date(2026, 7, 20, 6, 0))).toBe('早上好');
    expect(getClockGreeting(new Date(2026, 7, 20, 13, 0))).toBe('中午好');
    expect(getClockGreeting(new Date(2026, 7, 20, 16, 36))).toBe('下午好');
    expect(getClockGreeting(new Date(2026, 7, 20, 21, 0))).toBe('晚上好');
  });
});
