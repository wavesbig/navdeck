'use client';

import type { DateWidgetTone } from '@/components/widgets/DateWidgetDisplay';
import { DateWidgetShell } from '@/components/widgets/DateWidgetShell';
import {
  type DateDurationDisplayMode,
  dateDurationMetric,
  daysBetween,
  formatDate,
  formatDateShort,
  formatWeekday,
  nextOccurrence,
  prevOccurrence,
  progressBetween,
} from '@/lib/datetime';
import type { DateItem, WidgetSize } from '@/types';

interface CountdownDisplayItem extends DateItem {
  days: number;
  badgeLabel: string;
  dateLabel: string;
  helperLabel: string;
  unitLabel: string;
  valueLabel: string;
  tone: DateWidgetTone;
  /** 临近状态（今天 / 明天 / 3天内 / 7天内 / 里程碑） */
  urgencyLabel?: string;
  progress?: number;
  weekday?: string;
  shortLabel?: string;
  /** 下一次发生的具体日期（如「下一次 8月15日」，仅 L 档右区显示） */
  nextLabel?: string;
  /** 完整时长分解（如「1 年 1 个月」，仅 L 档显示） */
  breakdownLabel?: string;
}

function getCountdownUrgency(days: number): {
  label: string;
  tone: DateWidgetTone;
} {
  if (days === 0) return { label: '就是今天', tone: 'success' };
  if (days === 1) return { label: '明天', tone: 'warning' };
  if (days <= 3) return { label: '3天内', tone: 'warning' };
  if (days <= 7) return { label: '7天内', tone: 'accent' };
  if (days % 100 === 0) return { label: '里程碑', tone: 'success' };
  return { label: '还有', tone: 'accent' };
}

/**
 * 倒数日 widget
 *
 * 三档形态：
 * - S：最近一个事件的大数字 + 名称（无列表）
 * - M：S + 折叠列表（最多 3 项）
 * - L：M + 列表展开（最多 8 项，scrollable）
 */
export function Countdown(props: {
  instanceId: string;
  size?: WidgetSize;
  inEditMode?: boolean;
}) {
  return (
    <DateWidgetShell
      {...props}
      widgetKey="countdown"
      texts={{
        configAriaLabel: '配置倒数日',
        eyebrow: '倒数日',
        emptyTitle: '还没有倒数日',
        emptyHint: '点击添加第一个提醒',
      }}
      toDisplayItem={toCountdownDisplayItem}
      compareItems={compareCountdownItems}
    />
  );
}

function toCountdownDisplayItem(
  item: DateItem,
  displayMode: DateDurationDisplayMode,
): CountdownDisplayItem {
  const date = new Date(item.date);
  const now = new Date();
  if (item.recurUnit) {
    const nextDate = nextOccurrence(date, item.recurUnit, now);
    const days = daysBetween(now, nextDate);
    const metric = dateDurationMetric(nextDate, now, displayMode);
    // 周期进度：上一次发生 → 下一次发生
    const progress = progressBetween(
      prevOccurrence(nextDate, item.recurUnit),
      nextDate,
      now,
    );
    const weekday = formatWeekday(nextDate);
    const shortLabel = formatDateShort(nextDate);
    // 周期描述：每周五 / 每月15号 / 每年8月28日
    const cycleLabel =
      item.recurUnit === 'week'
        ? `每${formatWeekday(date)}`
        : item.recurUnit === 'month'
          ? `每月${date.getDate()}号`
          : `每年${formatDateShort(date)}`;
    if (days === 0) {
      const urgency = getCountdownUrgency(days);
      return {
        ...item,
        days,
        progress,
        weekday,
        shortLabel,
        badgeLabel: urgency.label,
        urgencyLabel: urgency.label,
        dateLabel: cycleLabel,
        nextLabel: `下一次 ${formatDateShort(nextDate)}`,
        helperLabel: '今天就是目标日',
        unitLabel: '',
        valueLabel: metric.label,
        tone: urgency.tone,
      };
    }

    const urgency = getCountdownUrgency(days);
    return {
      ...item,
      days,
      progress,
      weekday,
      shortLabel,
      badgeLabel: urgency.label,
      urgencyLabel: urgency.label === '还有' ? undefined : urgency.label,
      dateLabel: cycleLabel,
      nextLabel: `下一次 ${formatDateShort(nextDate)}`,
      helperLabel:
        displayMode === 'day'
          ? `还有 ${metric.label}`
          : `还有 ${metric.label} · 共 ${metric.totalDays} 天`,
      breakdownLabel: metric.breakdownLabel,
      unitLabel: '',
      valueLabel: metric.label,
      tone: urgency.tone,
    };
  }

  const days = daysBetween(now, date);
  const metric = dateDurationMetric(date, now, displayMode);
  // 流逝进度：创建日 → 目标日
  const progress = progressBetween(new Date(item.createdAt), date, now);
  const weekday = formatWeekday(date);
  const shortLabel = formatDateShort(date);
  if (days === 0) {
    const urgency = getCountdownUrgency(days);
    return {
      ...item,
      days,
      progress,
      weekday,
      shortLabel,
      badgeLabel: urgency.label,
      urgencyLabel: urgency.label,
      dateLabel: formatDate(date),
      helperLabel: '今天就是目标日',
      unitLabel: '',
      valueLabel: metric.label,
      tone: urgency.tone,
    };
  }

  if (days > 0) {
    const urgency = getCountdownUrgency(days);
    return {
      ...item,
      days,
      progress,
      weekday,
      shortLabel,
      badgeLabel: urgency.label,
      urgencyLabel: urgency.label === '还有' ? undefined : urgency.label,
      dateLabel: formatDate(date),
      helperLabel:
        displayMode === 'day'
          ? days === 1
            ? `还有 ${metric.label} · 明天`
            : `还有 ${metric.label}`
          : `还有 ${metric.label} · 共 ${metric.totalDays} 天`,
      breakdownLabel: metric.breakdownLabel,
      unitLabel: '',
      valueLabel: metric.label,
      tone: urgency.tone,
    };
  }

  return {
    ...item,
    days,
    progress,
    weekday,
    shortLabel,
    badgeLabel: '已过',
    dateLabel: formatDate(date),
    helperLabel:
      displayMode === 'day'
        ? `已过 ${metric.label}`
        : `已过 ${metric.label} · 共 ${metric.totalDays} 天`,
    breakdownLabel: metric.breakdownLabel,
    unitLabel: '',
    valueLabel: metric.label,
    tone: 'secondary',
  };
}

function compareCountdownItems(
  a: CountdownDisplayItem,
  b: CountdownDisplayItem,
): number {
  const aBucket = a.days >= 0 ? 0 : 1;
  const bBucket = b.days >= 0 ? 0 : 1;

  if (aBucket !== bBucket) {
    return aBucket - bBucket;
  }

  return Math.abs(a.days) - Math.abs(b.days);
}
