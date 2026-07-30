/**
 * 日期计算工具（基于 date-fns）
 *
 * 替换原手写 date.ts，统一使用 date-fns 的日历日比较，
 * 避免夏令时/时区带来的 24h 误差。
 */

import { addYears, differenceInCalendarDays, format } from 'date-fns';

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
