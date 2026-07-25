/**
 * 日期计算工具
 */

/** 计算两个日期之间的天数差（不取整到日，不含时分秒） */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  // 把两个日期都归零到当地 00:00:00
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * 倒数日：返回距离目标日期的天数
 * - recurring=true 时，自动取明年的同一天
 * - 已过期且非循环：返回负数
 */
export function daysUntil(
  target: Date,
  now: Date = new Date()
): {days: number; nextDate: Date; isFuture: boolean} {
  let next = new Date(target);

  if (target.getTime() < now.getTime()) {
    // 已过
    if (next.getFullYear() === target.getFullYear()) {
      // 第一次循环：把年份推到今年
      next = new Date(
        now.getFullYear(),
        target.getMonth(),
        target.getDate()
      );
    }
    if (next.getTime() < now.getTime()) {
      // 今年也过了，推到明年
      next = new Date(
        now.getFullYear() + 1,
        target.getMonth(),
        target.getDate()
      );
    }
  }

  const days = daysBetween(now, next);
  return {days, nextDate: next, isFuture: days >= 0};
}

/**
 * 正数日：返回自起始日期以来的天数
 */
export function daysSince(
  start: Date,
  now: Date = new Date()
): number {
  return daysBetween(start, now);
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 格式化为 M月D日（用于紧凑显示） */
export function formatDateShort(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
