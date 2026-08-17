/**
 * 日期计算工具（基于 date-fns）
 *
 * 替换原手写 date.ts，统一使用 date-fns 的日历日比较，
 * 避免夏令时/时区带来的 24h 误差。
 */

import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  format,
  getDate,
  getDay,
  getDaysInMonth,
  intervalToDuration,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

/** 循环粒度：每周 / 每月 / 每年 */
export type RecurUnit = 'week' | 'month' | 'year';

/** 将日期截到当月有效范围（如 1 月 31 日的月循环在 2 月落到 28 日） */
function clampToMonth(year: number, month: number, day: number): Date {
  return new Date(
    year,
    month,
    Math.min(day, getDaysInMonth(new Date(year, month))),
  );
}

/**
 * 循环日期的下一次发生（周/月/年循环共用）
 *
 * - week：锚定目标日期的星期几
 * - month：锚定几号；小月截到月末（锚 31 号时 2 月落 28 日，3 月恢复 31 日）
 * - year：锚定月日；2 月 29 日平年落 2 月 28 日
 * - 当天发生返回今天（不后跳）
 */
export function nextOccurrence(
  target: Date,
  unit: RecurUnit,
  now: Date = new Date(),
): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (unit === 'week') {
    const delta = (getDay(target) - getDay(today) + 7) % 7;
    return addDays(today, delta);
  }

  if (unit === 'month') {
    let next = clampToMonth(now.getFullYear(), now.getMonth(), getDate(target));
    if (differenceInCalendarDays(next, now) < 0) {
      const nextMonth = addMonths(today, 1);
      next = clampToMonth(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        getDate(target),
      );
    }
    return next;
  }

  let next = clampToMonth(
    now.getFullYear(),
    target.getMonth(),
    getDate(target),
  );
  if (differenceInCalendarDays(next, now) < 0) {
    next = clampToMonth(
      now.getFullYear() + 1,
      target.getMonth(),
      getDate(target),
    );
  }
  return next;
}

/** 下一次发生的上一个周期起点（用于循环进度计算） */
export function prevOccurrence(next: Date, unit: RecurUnit): Date {
  if (unit === 'week') return addWeeks(next, -1);
  if (unit === 'month') return addMonths(next, -1);
  return addYears(next, -1);
}

/** 计算两个日期之间的天数差（按日历日，忽略时分秒；过去返回负数） */
export function daysBetween(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from);
}

/**
 * 倒数日：返回距离目标日期的天数
 *
 * - target 在未来或今天：直接返回差值（>=0）
 * - target 已过去：自动推到今年的同月同日；今年也过去则推到明年
 *   （用于"每年循环"倒数日场景，调用方负责区分 recurring 语义）
 *
 * "已过去"按日历日判断（differenceInCalendarDays < 0），
 * 避免同一天内时间差导致"已过"误判
 */
export function daysUntil(
  target: Date,
  now: Date = new Date(),
): { days: number; nextDate: Date; isFuture: boolean } {
  let next = target;

  // 按日历日判断"已过去"：target 在 now 之前（且非同一天）
  if (differenceInCalendarDays(target, now) < 0) {
    // 已过去：推到今年的同月同日
    next = new Date(now.getFullYear(), target.getMonth(), target.getDate());
    if (differenceInCalendarDays(next, now) < 0) {
      // 今年也过去：推到明年
      next = addYears(next, 1);
    }
  }

  const days = differenceInCalendarDays(next, now);
  return { days, nextDate: next, isFuture: days >= 0 };
}

/**
 * 正数日：返回自起始日期以来的天数（未来起始返回负数）
 */
export function daysSince(start: Date, now: Date = new Date()): number {
  return differenceInCalendarDays(now, start);
}

/** 格式化为 YYYY-MM-DD */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** 格式化为 M月D日（紧凑显示，不补零） */
export function formatDateShort(date: Date): string {
  return format(date, 'M月d日');
}

/** 格式化为星期几（如「星期六」） */
export function formatWeekday(date: Date): string {
  return format(date, 'EEEE', { locale: zhCN });
}

/**
 * 计算从 start 到 end 的流逝进度（0~1，超出范围自动截断）
 *
 * end <= start（区间无效）时视为已完成，返回 1
 */
export function progressBetween(
  start: Date,
  end: Date,
  now: Date = new Date(),
): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}

/** 日期主指标展示单位：总天数 / 完整月数 / 完整年数 */
export type DateDurationDisplayMode = 'day' | 'month' | 'year';

/** 日期主指标（月 = 完整日历月数，年 = 完整日历年数） */
export interface DateDurationMetric {
  value: number;
  unit: '天' | '个月' | '年';
  totalDays: number;
  breakdownLabel: string;
}

/** 已经过的时长分解（年/月/周/日，日历口径） */
export interface ElapsedBreakdown {
  years: number;
  months: number;
  weeks: number;
  days: number;
}

function calendarDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 计算两日期间的日历时长分解（与方向无关，始终取绝对时长） */
function calendarDurationBreakdown(start: Date, end: Date): ElapsedBreakdown {
  const from = calendarDate(start);
  const to = calendarDate(end);
  const days = differenceInCalendarDays(to, from);
  if (days === 0) {
    return { years: 0, months: 0, weeks: 0, days: 0 };
  }
  const duration = intervalToDuration({
    start: days > 0 ? from : to,
    end: days > 0 ? to : from,
  });
  const remDays = duration.days ?? 0;
  return {
    years: duration.years ?? 0,
    months: duration.months ?? 0,
    weeks: Math.floor(remDays / 7),
    days: remDays % 7,
  };
}

/** 按展示单位换算日期间隔，并保留完整分解用于辅助信息 */
export function dateDurationMetric(
  start: Date,
  end: Date,
  mode: DateDurationDisplayMode,
): DateDurationMetric {
  const breakdown = calendarDurationBreakdown(start, end);
  const totalDays = Math.abs(differenceInCalendarDays(end, start));
  if (mode === 'year') {
    return {
      value: breakdown.years,
      unit: '年',
      totalDays,
      breakdownLabel: formatElapsedBreakdown(breakdown),
    };
  }
  if (mode === 'month') {
    return {
      value: breakdown.years * 12 + breakdown.months,
      unit: '个月',
      totalDays,
      breakdownLabel: formatElapsedBreakdown(breakdown),
    };
  }
  return {
    value: totalDays,
    unit: '天',
    totalDays,
    breakdownLabel: formatElapsedBreakdown(breakdown),
  };
}

/** 计算从 start 到 now 的时长分解（start 在未来时全为 0） */
export function elapsedBreakdown(
  start: Date,
  now: Date = new Date(),
): ElapsedBreakdown {
  if (differenceInCalendarDays(now, start) <= 0) {
    return { years: 0, months: 0, weeks: 0, days: 0 };
  }
  return calendarDurationBreakdown(start, now);
}

/** 格式化为「3 年 3 个月 1 周 2 天」，零值省略，全零返回「0 天」 */
export function formatElapsedBreakdown(b: ElapsedBreakdown): string {
  const parts: string[] = [];
  if (b.years) parts.push(`${b.years} 年`);
  if (b.months) parts.push(`${b.months} 个月`);
  if (b.weeks) parts.push(`${b.weeks} 周`);
  if (b.days || parts.length === 0) parts.push(`${b.days} 天`);
  return parts.join(' ');
}
/**
 * 循环锚点日期合成（日期选择器按循环粒度适配时使用）
 *
 * 锚点只需承载对应粒度信息：
 * - week：承载星期几
 * - month：承载号数（必须保留原号数，否则「每月 31 号」会被截成 28 号）
 * - year：承载月日
 */

/** 指定星期几的锚点日期：今天起最近的一个该星期几（0=周日） */
export function dateForWeekday(weekday: number, now: Date = new Date()): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return addDays(today, (weekday - getDay(today) + 7) % 7);
}

/** 指定号数的锚点日期：取最近一个能容纳该号数的月份（保留号数供循环锚定） */
export function dateForDayOfMonth(day: number, now: Date = new Date()): Date {
  let year = now.getFullYear();
  let month = now.getMonth();
  // 小月没有 29/30/31 号时往后找能容纳的月份
  while (day > getDaysInMonth(new Date(year, month, 1))) {
    const next = addMonths(new Date(year, month, 1), 1);
    year = next.getFullYear();
    month = next.getMonth();
  }
  return new Date(year, month, day);
}

/** 指定月日的锚点日期：取今年，号数超出该月则截到月末（month 为 1~12） */
export function dateForMonthDay(
  month: number,
  day: number,
  now: Date = new Date(),
): Date {
  return clampToMonth(now.getFullYear(), month - 1, day);
}
