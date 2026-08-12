'use client';

import { Card } from '@astryxdesign/core/Card';
import { Dialog } from '@astryxdesign/core/Dialog';
import { addYears } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { DateItemConfigPanel } from '@/components/widgets/DateItemConfigPanel';
import {
  DateWidgetDisplay,
  type DateWidgetTone,
} from '@/components/widgets/DateWidgetDisplay';
import { useDateItems } from '@/hooks/useDateItems';
import {
  daysSince,
  daysUntil,
  elapsedBreakdown,
  formatDate,
  formatDateShort,
  formatElapsedBreakdown,
  formatWeekday,
  progressBetween,
} from '@/lib/datetime';
import type { DateItem, WidgetSize } from '@/types';

interface CountupWidgetProps {
  /** 实例 id（多实例下每个 widget 实例独立管理日期项） */
  instanceId: string;
  /** 尺寸档位：S=紧凑 / M=标准 / L=详细 */
  size?: WidgetSize;
  /** 编辑态：保留齿轮但通过 stopPropagation 防止误触发拖拽 */
  inEditMode?: boolean;
}

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
export function CountupWidget({
  instanceId,
  size = 'M',
  inEditMode = false,
}: CountupWidgetProps) {
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
    () => items.map(toCountupDisplayItem).sort(compareCountupItems),
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
        aria-label="配置正数日"
      >
        <DateItemConfigPanel
          widgetKey="countup"
          items={sorted}
          onAdd={addItem}
          onUpdate={updateItem}
          onDelete={deleteItem}
          onDone={() => setConfigOpen(false)}
        />
      </Dialog>
      <div className="flex h-full min-h-0">
        <DateWidgetDisplay
          eyebrow="正数日"
          size={size}
          isLoading={isLoading}
          items={visible}
          emptyTitle="还没有正数日"
          emptyHint="点击添加一个开始日期"
          onEmptyClick={inEditMode ? undefined : () => setConfigOpen(true)}
        />
      </div>
    </Card>
  );
}

function toCountupDisplayItem(item: DateItem): CountupDisplayItem {
  const date = new Date(item.date);
  const now = new Date();
  const days = daysSince(date, now);
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
      helperLabel:
        Math.abs(days) === 1 ? '明天开始' : `${Math.abs(days)} 天后开始`,
      unitLabel: '天后开始',
      valueLabel: String(Math.abs(days)),
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
      unitLabel: '今天',
      valueLabel: '0',
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
    helperLabel: `已经 ${days} 天`,
    breakdownLabel: formatElapsedBreakdown(elapsedBreakdown(date, now)),
    anniversaryLabel:
      daysToAnniversary === 0
        ? '今天是周年纪念日'
        : `距 ${years} 周年还有 ${daysToAnniversary} 天`,
    unitLabel: '天',
    valueLabel: String(days),
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
