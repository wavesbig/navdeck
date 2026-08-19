'use client';

import { Card } from '@astryxdesign/core/Card';
import { Dialog } from '@astryxdesign/core/Dialog';
import { useEffect, useMemo, useState } from 'react';
import { DateItemConfigPanel } from '@/components/widgets/DateItemConfigPanel';
import type { DateWidgetKey } from '@/components/widgets/DateItemForm';
import {
  DateWidgetDisplay,
  type DateWidgetVisualItem,
} from '@/components/widgets/DateWidgetDisplay';
import { useDateItems } from '@/hooks/useDateItems';
import { useDateWidgetDisplayMode } from '@/hooks/useDateWidgetDisplayMode';
import type { DateDurationDisplayMode } from '@/lib/datetime';
import type { DateItem, WidgetSize } from '@/types';

interface DateWidgetShellProps<T extends DateItem & DateWidgetVisualItem> {
  /** 实例 id（多实例下每个 widget 实例独立管理日期项） */
  instanceId: string;
  /** 尺寸档位：S=紧凑 / M=标准 / L=详细 */
  size?: WidgetSize;
  /** 编辑态：保留齿轮但通过 stopPropagation 防止误触发拖拽 */
  inEditMode?: boolean;
  widgetKey: DateWidgetKey;
  texts: {
    configAriaLabel: string;
    eyebrow: string;
    emptyTitle: string;
    emptyHint: string;
  };
  /** DateItem -> 展示项（倒数日 / 正数日各自的计算逻辑） */
  toDisplayItem: (item: DateItem, displayMode: DateDurationDisplayMode) => T;
  compareItems: (a: T, b: T) => number;
}

/**
 * 倒数日 / 正数日共用的 widget 外壳
 *
 * 承接两类 widget 完全相同的脚手架：
 * 日期项数据（useDateItems）、展示单位切换、配置弹窗事件监听、
 * 空卡片自弃、Card + Dialog + DateItemConfigPanel + DateWidgetDisplay 组装。
 * 差异（指标计算、排序、文案）通过 props 注入。
 */
export function DateWidgetShell<T extends DateItem & DateWidgetVisualItem>({
  instanceId,
  size = 'M',
  inEditMode = false,
  widgetKey,
  texts,
  toDisplayItem,
  compareItems,
}: DateWidgetShellProps<T>) {
  const { items, isLoading, isError, addItem, updateItem, deleteItem } =
    useDateItems(instanceId);
  const [configOpen, setConfigOpen] = useState(false);
  const { displayMode, cycleDisplayMode } =
    useDateWidgetDisplayMode(instanceId);

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
    () =>
      items.map((item) => toDisplayItem(item, displayMode)).sort(compareItems),
    [displayMode, items, toDisplayItem, compareItems],
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
        purpose="form"
        aria-label={texts.configAriaLabel}
      >
        <DateItemConfigPanel
          widgetKey={widgetKey}
          items={sorted}
          onAdd={addItem}
          onUpdate={updateItem}
          onDelete={deleteItem}
          onDone={() => setConfigOpen(false)}
        />
      </Dialog>
      <div className="flex h-full min-h-0">
        <DateWidgetDisplay
          eyebrow={texts.eyebrow}
          size={size}
          isLoading={isLoading}
          items={visible}
          emptyTitle={texts.emptyTitle}
          emptyHint={texts.emptyHint}
          onEmptyClick={inEditMode ? undefined : () => setConfigOpen(true)}
          displayMode={displayMode}
          onCycleDisplayMode={cycleDisplayMode}
        />
      </div>
    </Card>
  );
}
