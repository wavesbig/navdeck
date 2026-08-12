'use client';

import type { ISODateString } from '@astryxdesign/core/Calendar';
import { DateInput } from '@astryxdesign/core/DateInput';
import { HStack } from '@astryxdesign/core/HStack';
import { Selector } from '@astryxdesign/core/Selector';
import { getDaysInMonth } from 'date-fns';
import {
  dateForDayOfMonth,
  dateForMonthDay,
  dateForWeekday,
  formatDate,
  type RecurUnit,
} from '@/lib/datetime';

/**
 * 随循环粒度适配的日期选择器
 *
 * 循环项只有部分日期维度有意义，完整日历会误导：
 * - 不循环：完整日历（选具体某天）
 * - 每周：只选星期几
 * - 每月：只选几号（如发工资 15 号）
 * - 每年：只选月 + 日
 *
 * 选择结果合成为锚点日期（见 datetime.ts 的 dateForXxx），
 * 循环语义由 nextOccurrence 统一解释。
 */

const WEEKDAY_OPTIONS = [
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
  { value: '0', label: '周日' },
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} 号`,
}));

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} 月`,
}));

interface RecurDatePickerProps {
  /** '' 表示不循环 */
  recurUnit: '' | RecurUnit;
  /** ISO 日期（yyyy-MM-dd），空字符串表示未选 */
  date: string;
  onChange: (date: string) => void;
  /** 不循环时日历输入框的标签 */
  dateLabel?: string;
}

/** 解析 yyyy-MM-dd 为本地年月日（避免 new Date(iso) 的 UTC 解析坑） */
function parseIso(
  date: string,
): { month: number; day: number; dayOfWeek: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return { month: d.getMonth() + 1, day: d.getDate(), dayOfWeek: d.getDay() };
}

export function RecurDatePicker({
  recurUnit,
  date,
  onChange,
  dateLabel = '日期',
}: RecurDatePickerProps) {
  const parsed = date ? parseIso(date) : null;

  if (recurUnit === 'week') {
    return (
      <Selector
        label="星期"
        placeholder="选择星期几"
        options={WEEKDAY_OPTIONS}
        value={parsed ? String(parsed.dayOfWeek) : undefined}
        onChange={(v) => onChange(formatDate(dateForWeekday(Number(v))))}
        width="100%"
      />
    );
  }

  if (recurUnit === 'month') {
    return (
      <Selector
        label="几号"
        placeholder="选择几号"
        options={DAY_OPTIONS}
        value={parsed ? String(parsed.day) : undefined}
        onChange={(v) => onChange(formatDate(dateForDayOfMonth(Number(v))))}
        width="100%"
      />
    );
  }

  if (recurUnit === 'year') {
    // 日选项跟随已选月份（2 月只给到 28/29 号）
    const dayCount = parsed
      ? getDaysInMonth(new Date(new Date().getFullYear(), parsed.month - 1, 1))
      : 31;
    const dayOptions = DAY_OPTIONS.slice(0, dayCount);
    return (
      <HStack gap={2} className="w-full">
        <Selector
          label="月份"
          placeholder="月"
          options={MONTH_OPTIONS}
          value={parsed ? String(parsed.month) : undefined}
          onChange={(v) =>
            onChange(formatDate(dateForMonthDay(Number(v), parsed?.day ?? 1)))
          }
          width="100%"
        />
        <Selector
          label="号数"
          placeholder="日"
          options={dayOptions}
          value={parsed ? String(parsed.day) : undefined}
          onChange={(v) =>
            onChange(formatDate(dateForMonthDay(parsed?.month ?? 1, Number(v))))
          }
          width="100%"
        />
      </HStack>
    );
  }

  return (
    <DateInput
      label={dateLabel}
      value={(date || undefined) as ISODateString | undefined}
      onChange={(value) => onChange(value ?? '')}
    />
  );
}
