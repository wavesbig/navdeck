'use client';

import { Card } from '@astryxdesign/core/Card';
import { Dialog } from '@astryxdesign/core/Dialog';
import { useEffect, useMemo, useState } from 'react';
import { DateItemConfigPanel } from '@/components/widgets/DateItemConfigPanel';
import {
  DateWidgetDisplay,
  type DateWidgetTone,
} from '@/components/widgets/DateWidgetDisplay';
import { useDateItems } from '@/hooks/useDateItems';
import {
  daysBetween,
  formatDate,
  formatDateShort,
  formatWeekday,
  nextOccurrence,
  prevOccurrence,
  progressBetween,
} from '@/lib/datetime';
import type { DateItem, WidgetSize } from '@/types';

interface CountdownWidgetProps {
  /** 实例 id（多实例下每个 widget 实例独立管理日期项） */
  instanceId: string;
  /** 尺寸档位：S=紧凑 / M=标准 / L=详细 */
  size?: WidgetSize;
  /** 编辑态：保留齿轮但通过 stopPropagation 防止误触发拖拽 */
  inEditMode?: boolean;
}

interface CountdownDisplayItem extends DateItem {
  days: number;
  badgeLabel: string;
  dateLabel: string;
  helperLabel: string;
  unitLabel: string;
  valueLabel: string;
  tone: DateWidgetTone;
  progress?: number;
  weekday?: string;
  shortLabel?: string;
  /** 下一次发生的具体日期（如「下一次 8月15日」，仅 L 档右区显示） */
  nextLabel?: string;
}

/**
 * 倒数日 widget
 *
 * 三档形态：
 * - S：最近一个事件的大数字 + 名称（无列表）
 * - M：S + 折叠列表（最多 3 项）
 * - L：M + 列表展开（最多 8 项，scrollable）
 */
export function CountdownWidget({
  instanceId,
  size = 'M',
  inEditMode = false,
}: CountdownWidgetProps) {
  const { items, isLoading, isError, addItem, updateItem, deleteItem } =
    useDateItems(instanceId);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    const handleOpenConfig = (event: Event) => {
      const detail = (event as CustomEvent<{ instanceId?: string }>).detail;
      if (detail?.instanceId === instanceId) {
        setConfigOpen(true);
      }
    };

    window.addEventListener('widget-config-open', handleOpenConfig);
    return () => {
      window.removeEventListener('widget-config-open', handleOpenConfig);
    };
  }, [instanceId]);
  // 空卡片自弃：弹窗被关闭且仍没有任何日期项时，移除整个实例
  //（先填日期再出卡片：取消 = 不添加；加载失败时不自弃防止误删）
  const handleConfigOpenChange = (open: boolean) => {
    setConfigOpen(open);
    if (!open && !isLoading && !isError && items.length === 0) {
      window.dispatchEvent(
        new CustomEvent('widget-instance-remove', { detail: { instanceId } }),
      );
    }
  };

  const sorted = useMemo(
    () => items.map(toCountdownDisplayItem).sort(compareCountdownItems),
    [items],
  );

  const maxItems = 1;
  const visible = sorted.slice(0, maxItems);

  return (
    <Card
      className="widget-surface date-widget-surface relative"
      elevation="none"
      padding={size === 'S' ? 2 : 4}
    >
      <Dialog
        isOpen={configOpen}
        onOpenChange={handleConfigOpenChange}
        width={320}
        purpose="info"
        aria-label="配置倒数日"
      >
        <DateItemConfigPanel
          widgetKey="countdown"
          items={sorted}
          onAdd={addItem}
          onUpdate={updateItem}
          onDelete={deleteItem}
          onDone={() => setConfigOpen(false)}
        />
      </Dialog>
      <div className="flex h-full min-h-0">
        <DateWidgetDisplay
          eyebrow="倒数日"
          size={size}
          isLoading={isLoading}
          items={visible}
          emptyTitle="还没有倒数日"
          emptyHint="点击添加第一个提醒"
          onEmptyClick={inEditMode ? undefined : () => setConfigOpen(true)}
        />
      </div>
    </Card>
  );
}

function toCountdownDisplayItem(item: DateItem): CountdownDisplayItem {
  const date = new Date(item.date);
  const now = new Date();
  if (item.recurUnit) {
    const nextDate = nextOccurrence(date, item.recurUnit, now);
    const days = daysBetween(now, nextDate);
    // 周期进度：上一次发生 → 下一次发生
    const progress = progressBetween(
      prevOccurrence(nextDate, item.recurUnit),
      nextDate,
      now,
    );
    const weekday = formatWeekday(nextDate);
    const shortLabel = formatDateShort(nextDate);
    // 周期描述：每周五 / 每月 15 号 / 每年
    const cycleLabel =
      item.recurUnit === 'week'
        ? `每${formatWeekday(date)}`
        : item.recurUnit === 'month'
          ? `每月 ${date.getDate()} 号`
          : `每年 ${formatDateShort(date)}`;
    if (days === 0) {
      return {
        ...item,
        days,
        progress,
        weekday,
        shortLabel,
        badgeLabel: '今天',
        dateLabel: cycleLabel,
        nextLabel: `下一次 ${formatDateShort(nextDate)}`,
        helperLabel: '今天就是目标日',
        unitLabel: '今天',
        valueLabel: '0',
        tone: 'success',
      };
    }

    const milestone = days % 100 === 0;
    return {
      ...item,
      days,
      progress,
      weekday,
      shortLabel,
      badgeLabel: milestone ? '里程碑' : '还有',
      dateLabel: cycleLabel,
      nextLabel: `下一次 ${formatDateShort(nextDate)}`,
      helperLabel: `还有 ${days} 天`,
      unitLabel: '天后',
      valueLabel: String(days),
      tone: milestone ? 'success' : days <= 3 ? 'warning' : 'accent',
    };
  }

  const days = daysBetween(now, date);
  // 流逝进度：创建日 → 目标日
  const progress = progressBetween(new Date(item.createdAt), date, now);
  const weekday = formatWeekday(date);
  const shortLabel = formatDateShort(date);
  if (days === 0) {
    return {
      ...item,
      days,
      progress,
      weekday,
      shortLabel,
      badgeLabel: '今天',
      dateLabel: formatDate(date),
      helperLabel: '今天就是目标日',
      unitLabel: '今天',
      valueLabel: '0',
      tone: 'success',
    };
  }

  if (days > 0) {
    const milestone = days % 100 === 0;
    return {
      ...item,
      days,
      progress,
      weekday,
      shortLabel,
      badgeLabel: milestone ? '里程碑' : '还有',
      dateLabel: formatDate(date),
      helperLabel: days === 1 ? '还有 1 天 · 明天' : `还有 ${days} 天`,
      unitLabel: '天后',
      valueLabel: String(days),
      tone: milestone ? 'success' : days <= 3 ? 'warning' : 'accent',
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
    helperLabel: `已过 ${Math.abs(days)} 天`,
    unitLabel: '天前',
    valueLabel: String(Math.abs(days)),
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
