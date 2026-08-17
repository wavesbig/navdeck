import { describe, expect, it } from 'vitest';
import {
  dateDurationMetric,
  dateForDayOfMonth,
  dateForMonthDay,
  dateForWeekday,
  daysBetween,
  daysSince,
  daysUntil,
  elapsedBreakdown,
  formatDate,
  formatDateShort,
  formatElapsedBreakdown,
  formatWeekday,
  nextOccurrence,
  prevOccurrence,
  progressBetween,
} from './datetime';

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

describe('formatWeekday', () => {
  it('格式化为中文星期', () => {
    // 2026-01-05 是周一
    expect(formatWeekday(new Date(2026, 0, 5))).toBe('星期一');
    // 2026-08-11 是周二
    expect(formatWeekday(new Date(2026, 7, 11))).toBe('星期二');
  });
});

describe('progressBetween', () => {
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 0, 11);

  it('起点处返回 0', () => {
    expect(progressBetween(start, end, start)).toBe(0);
  });

  it('中点返回 0.5', () => {
    expect(progressBetween(start, end, new Date(2026, 0, 6))).toBe(0.5);
  });

  it('终点及之后返回 1（截断）', () => {
    expect(progressBetween(start, end, end)).toBe(1);
    expect(progressBetween(start, end, new Date(2026, 5, 1))).toBe(1);
  });

  it('起点之前返回 0（截断）', () => {
    expect(progressBetween(start, end, new Date(2025, 11, 1))).toBe(0);
  });

  it('无效区间（end <= start）返回 1', () => {
    expect(progressBetween(end, start, new Date(2026, 0, 5))).toBe(1);
  });
});

describe('nextOccurrence', () => {
  // 2026-08-11 是周二
  const now = new Date(2026, 7, 11);

  it('周循环：锚定星期几，本周未到取本周，已过取下周一', () => {
    // 目标周五（2026-08-14）
    expect(nextOccurrence(new Date(2026, 7, 14), 'week', now)).toEqual(
      new Date(2026, 7, 14),
    );
    // 目标周一（已过）→ 下周一 2026-08-17
    expect(nextOccurrence(new Date(2026, 7, 10), 'week', now)).toEqual(
      new Date(2026, 7, 17),
    );
  });

  it('周循环：当天发生返回今天', () => {
    expect(nextOccurrence(new Date(2026, 7, 11), 'week', now)).toEqual(
      new Date(2026, 7, 11),
    );
  });

  it('月循环：锚定几号，本月已过取下月', () => {
    // 每月 15 号
    expect(nextOccurrence(new Date(2026, 0, 15), 'month', now)).toEqual(
      new Date(2026, 7, 15),
    );
    // 每月 5 号（已过）→ 9 月 5 日
    expect(nextOccurrence(new Date(2026, 0, 5), 'month', now)).toEqual(
      new Date(2026, 8, 5),
    );
  });

  it('月循环：31 号在小月截到月末，次月恢复', () => {
    // 锚 1 月 31 日，now = 2026-03-01 → 下一个是 3 月 31 日（不是 3 月 28 日）
    expect(
      nextOccurrence(new Date(2026, 0, 31), 'month', new Date(2026, 2, 1)),
    ).toEqual(new Date(2026, 2, 31));
    // now = 2026-02-01 → 2 月截到 28 日
    expect(
      nextOccurrence(new Date(2026, 0, 31), 'month', new Date(2026, 1, 1)),
    ).toEqual(new Date(2026, 1, 28));
  });

  it('年循环：同月同日，今年已过取明年', () => {
    expect(nextOccurrence(new Date(2000, 7, 20), 'year', now)).toEqual(
      new Date(2026, 7, 20),
    );
    expect(nextOccurrence(new Date(2000, 7, 1), 'year', now)).toEqual(
      new Date(2027, 7, 1),
    );
  });

  it('年循环：2 月 29 日平年落 2 月 28 日', () => {
    expect(
      nextOccurrence(new Date(2024, 1, 29), 'year', new Date(2026, 0, 1)),
    ).toEqual(new Date(2026, 1, 28));
  });
});

describe('prevOccurrence', () => {
  it('按粒度回退一个周期', () => {
    const next = new Date(2026, 7, 15);
    expect(prevOccurrence(next, 'week')).toEqual(new Date(2026, 7, 8));
    expect(prevOccurrence(next, 'month')).toEqual(new Date(2026, 6, 15));
    expect(prevOccurrence(next, 'year')).toEqual(new Date(2025, 7, 15));
  });
});

describe('elapsedBreakdown + formatElapsedBreakdown', () => {
  it('分解为年月周日', () => {
    // 2023-05-01 → 2026-08-11 = 3 年 3 个月 1 周 3 天
    const b = elapsedBreakdown(new Date(2023, 4, 1), new Date(2026, 7, 11));
    expect(b).toEqual({ years: 3, months: 3, weeks: 1, days: 3 });
    expect(formatElapsedBreakdown(b)).toBe('3 年 3 个月 1 周 3 天');
  });

  it('零值省略，不足一周只显示天', () => {
    const b = elapsedBreakdown(new Date(2026, 7, 8), new Date(2026, 7, 11));
    expect(formatElapsedBreakdown(b)).toBe('3 天');
  });

  it('start 在未来时返回 0 天', () => {
    expect(
      formatElapsedBreakdown(
        elapsedBreakdown(new Date(2027, 0, 1), new Date(2026, 7, 11)),
      ),
    ).toBe('0 天');
  });
});

describe('dateDurationMetric', () => {
  it('按天、完整月、完整年换算同一段时间', () => {
    const start = new Date(2025, 0, 15);
    const end = new Date(2026, 2, 14);

    expect(dateDurationMetric(start, end, 'day').value).toBe(423);
    expect(dateDurationMetric(start, end, 'month').value).toBe(13);
    expect(dateDurationMetric(start, end, 'year').value).toBe(1);
    expect(dateDurationMetric(start, end, 'month').breakdownLabel).toBe(
      '1 年 1 个月 3 周 6 天',
    );
  });

  it('日期方向不影响换算结果', () => {
    const start = new Date(2026, 2, 14);
    const end = new Date(2025, 0, 15);

    expect(dateDurationMetric(start, end, 'month').value).toBe(13);
    expect(dateDurationMetric(start, end, 'month').totalDays).toBe(423);
  });

  it('同一天返回零值', () => {
    const date = new Date(2026, 7, 17);
    const metric = dateDurationMetric(date, date, 'year');

    expect(metric.value).toBe(0);
    expect(metric.totalDays).toBe(0);
    expect(metric.breakdownLabel).toBe('0 天');
  });
});
describe('dateForWeekday', () => {
  // 2026-08-12 是周三（getDay=3）
  const now = new Date(2026, 7, 12);

  it('本周五', () => {
    expect(formatDate(dateForWeekday(5, now))).toBe('2026-08-14');
  });

  it('今天（周三）不后跳', () => {
    expect(formatDate(dateForWeekday(3, now))).toBe('2026-08-12');
  });

  it('已过的周一取下周', () => {
    expect(formatDate(dateForWeekday(1, now))).toBe('2026-08-17');
  });
});

describe('dateForDayOfMonth', () => {
  it('当月能容纳时取当月', () => {
    const now = new Date(2026, 7, 12);
    expect(formatDate(dateForDayOfMonth(15, now))).toBe('2026-08-15');
    expect(formatDate(dateForDayOfMonth(31, now))).toBe('2026-08-31');
  });

  it('小月容纳不了 31 号时取最近能容纳的月份', () => {
    const now = new Date(2026, 1, 10); // 2026-02-10，平年 2 月 28 天
    expect(formatDate(dateForDayOfMonth(31, now))).toBe('2026-03-31');
    expect(formatDate(dateForDayOfMonth(29, now))).toBe('2026-03-29');
    expect(formatDate(dateForDayOfMonth(5, now))).toBe('2026-02-05');
  });
});

describe('dateForMonthDay', () => {
  it('常规月日取今年', () => {
    const now = new Date(2026, 7, 12);
    expect(formatDate(dateForMonthDay(8, 18, now))).toBe('2026-08-18');
  });

  it('号数超出该月截到月末', () => {
    const now = new Date(2026, 7, 12);
    expect(formatDate(dateForMonthDay(2, 31, now))).toBe('2026-02-28');
  });
});
