'use client';

import { addYears } from 'date-fns';
import type { DateWidgetTone } from '@/components/widgets/DateWidgetDisplay';
import { DateWidgetShell } from '@/components/widgets/DateWidgetShell';
import {
  type DateDurationDisplayMode,
  dateDurationMetric,
  daysSince,
  daysUntil,
  formatDate,
  formatDateShort,
  formatWeekday,
  progressBetween,
} from '@/lib/datetime';
import type { DateItem, WidgetSize } from '@/types';

interface CountupDisplayItem extends DateItem {
  days: number;
  badgeLabel: string;
  dateLabel: string;
  helperLabel: string;
  unitLabel: string;
  valueLabel: string;
  tone: DateWidgetTone;
  progress?: number;
  weekday?: string;
  anniversaryLabel?: string;
  shortLabel?: string;
  breakdownLabel?: string;
}

/**
 * 正数日 widget
 *
 * 三档形态：
 * - S：最近一个事件的大数字 + 名称（无列表）
 * - M：S + 折叠列表（最多 3 项）
 * - L：M + 列表展开（最多 8 项，scrollable）
 */
export function Countup(props: {
  instanceId: string;
  size?: WidgetSize;
  inEditMode?: boolean;
}) {
  return (
    <DateWidgetShell
      {...props}
      widgetKey="countup"
      texts={{
        configAriaLabel: '配置正数日',
        eyebrow: '正数日',
        emptyTitle: '还没有正数日',
        emptyHint: '点击添加一个开始日期',
      }}
      toDisplayItem={toCountupDisplayItem}
      compareItems={compareCountupItems}
    />
  );
}

function toCountupDisplayItem(
  item: DateItem,
  displayMode: DateDurationDisplayMode,
): CountupDisplayItem {
  const date = new Date(item.date);
  const now = new Date();
  const days = daysSince(date, now);
  const metric = dateDurationMetric(date, now, displayMode);
  const weekday = formatWeekday(date);
  const shortLabel = `${formatDateShort(date)}开始`;

  if (days < 0) {
    return {
      ...item,
      days,
      weekday,
      shortLabel,
      // 未开始的正数日：显示创建日 → 开始日的临近进度
      progress: progressBetween(new Date(item.createdAt), date, now),
      badgeLabel: '未开始',
      dateLabel: `开始于 ${formatDate(date)}`,
      helperLabel: Math.abs(days) === 1 ? '明天开始' : `${metric.label}后开始`,
      unitLabel: '',
      valueLabel: metric.label,
      tone: 'secondary',
    };
  }

  if (days === 0) {
    return {
      ...item,
      days,
      weekday,
      shortLabel,
      progress: 0,
      badgeLabel: '今天',
      dateLabel: `开始于 ${formatDate(date)}`,
      helperLabel: '今天开始累计',
      unitLabel: '',
      valueLabel: metric.label,
      tone: 'success',
    };
  }

  // 周年进度：上一个周年 → 下一个周年
  const { days: daysToAnniversary, nextDate } = daysUntil(date, now);
  const progress = progressBetween(addYears(nextDate, -1), nextDate, now);
  const years = nextDate.getFullYear() - date.getFullYear();
  const milestone = days % 100 === 0;

  return {
    ...item,
    days,
    weekday,
    shortLabel,
    progress,
    badgeLabel: milestone ? '里程碑' : '已经',
    dateLabel: `开始于 ${formatDate(date)}`,
    helperLabel:
      displayMode === 'day'
        ? `已经 ${metric.label}`
        : `已经 ${metric.label} · 共 ${metric.totalDays} 天`,
    breakdownLabel: metric.breakdownLabel,
    anniversaryLabel:
      daysToAnniversary === 0
        ? '今天是周年纪念日'
        : `距 ${years} 周年还有 ${daysToAnniversary} 天`,
    unitLabel: '',
    valueLabel: metric.label,
    tone: 'success',
  };
}

function compareCountupItems(
  a: CountupDisplayItem,
  b: CountupDisplayItem,
): number {
  const aBucket = a.days >= 0 ? 0 : 1;
  const bBucket = b.days >= 0 ? 0 : 1;

  if (aBucket !== bBucket) {
    return aBucket - bBucket;
  }

  if (a.days >= 0) {
    return b.days - a.days;
  }

  return Math.abs(a.days) - Math.abs(b.days);
}
