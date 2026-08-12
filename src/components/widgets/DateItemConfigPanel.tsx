'use client';

import { Button } from '@astryxdesign/core/Button';
import { DialogHeader, useImperativeDialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { RecurDatePicker } from '@/components/widgets/RecurDatePicker';
import { formatDate, type RecurUnit } from '@/lib/datetime';
import type { DateItem } from '@/types';

type DateWidgetKey = 'countdown' | 'countup';

/** 两类日期 widget 的文案差异（结构完全一致，仅文案与是否支持循环不同） */
const PANEL_META: Record<
  DateWidgetKey,
  {
    title: string;
    subtitle: string;
    namePlaceholder: string;
    dateLabel: string;
    requiredHint: string;
    deleteTitle: string;
    deleteHint: string;
  }
> = {
  countdown: {
    title: '管理倒数日',
    subtitle: '循环项会按下一次发生时间计算，临近 3 天内会高亮提醒。',
    namePlaceholder: '如：春节',
    dateLabel: '日期',
    requiredHint: '请填写名称和日期',
    deleteTitle: '删除倒数日',
    deleteHint: '删除后不会保留历史记录。',
  },
  countup: {
    title: '管理正数日',
    subtitle: '从开始日期起持续累计，每年临近周年会显示提醒。',
    namePlaceholder: '如：在一起的日子',
    dateLabel: '起始日期',
    requiredHint: '请填写名称和起始日期',
    deleteTitle: '删除正数日',
    deleteHint: '删除后累计天数会一起清空。',
  },
};

interface DateItemInput {
  name: string;
  date: string;
  recurUnit?: RecurUnit | null;
}

interface DateItemConfigPanelProps {
  /** 决定文案与是否展示循环设置（循环仅倒数日支持） */
  widgetKey: DateWidgetKey;
  items: DateItem[];
  onAdd: (input: DateItemInput) => Promise<void>;
  onUpdate: (id: string, input: Partial<DateItemInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** 保存成功 / 取消后关闭弹窗 */
  onDone: () => void;
}

/** 倒数日 / 正数日共用的日期项管理面板（单卡片单日期项，编辑首个 item） */
export function DateItemConfigPanel({
  widgetKey,
  items,
  onAdd,
  onUpdate,
  onDelete,
  onDone,
}: DateItemConfigPanelProps) {
  const primaryItem = items[0] ?? null;
  // key 跟随编辑对象：新增 ↔ 编辑切换、删除后回到空表单时整体重挂载，
  // 表单 state 自然重置（替代 effect 监听 prop 变化逐个 setState）
  return (
    <PanelForm
      key={primaryItem?.id ?? 'new'}
      widgetKey={widgetKey}
      primaryItem={primaryItem}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDone={onDone}
    />
  );
}

interface PanelFormProps extends Omit<DateItemConfigPanelProps, 'items'> {
  /** 当前编辑的日期项；null 表示新增 */
  primaryItem: DateItem | null;
}

function PanelForm({
  widgetKey,
  primaryItem,
  onAdd,
  onUpdate,
  onDelete,
  onDone,
}: PanelFormProps) {
  const meta = PANEL_META[widgetKey];
  const [name, setName] = useState(primaryItem?.name ?? '');
  const [date, setDate] = useState(
    primaryItem ? primaryItem.date.slice(0, 10) : '',
  );
  /** '' 表示不循环（仅倒数日可编辑） */
  const [recurUnit, setRecurUnit] = useState<'' | RecurUnit>(
    primaryItem?.recurUnit ?? '',
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const confirmDialog = useImperativeDialog();
  const showToast = useToast();

  const handleSubmit = async () => {
    if (!name.trim() || !date) {
      setError(meta.requiredHint);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const trimmedName = name.trim();
      // 循环字段仅倒数日提交（正数日带 recurUnit 会被服务端拒绝）
      const input: DateItemInput =
        widgetKey === 'countdown'
          ? { name: trimmedName, date, recurUnit: recurUnit || null }
          : { name: trimmedName, date };
      if (primaryItem) {
        await onUpdate(primaryItem.id, input);
        showToast({
          body: `已更新「${trimmedName}」`,
          type: 'info',
        });
      } else {
        await onAdd(input);
        showToast({
          body: `已添加「${trimmedName}」`,
          type: 'info',
        });
      }
      onDone();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : primaryItem ? '保存失败' : '新增失败',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: DateItem) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      confirmDialog.show(
        <VStack gap={4}>
          <DialogHeader
            title={meta.deleteTitle}
            onOpenChange={(open) => !open && resolve(false)}
          />
          <VStack gap={1}>
            <Text>确认删除「{item.name}」吗？</Text>
            <Text size="2xs" color="secondary">
              {meta.deleteHint}
            </Text>
          </VStack>
          <div className="flex justify-end gap-2">
            <Button
              label="取消"
              variant="ghost"
              onClick={() => {
                confirmDialog.hide();
                resolve(false);
              }}
            />
            <Button
              label="删除"
              variant="destructive"
              onClick={() => {
                confirmDialog.hide();
                resolve(true);
              }}
            />
          </div>
        </VStack>,
        { purpose: 'required', width: 360 },
      );
    });

    if (!confirmed) return;

    try {
      await onDelete(item.id);
      showToast({
        body: `已删除「${item.name}」`,
        type: 'info',
      });
    } catch (e) {
      showToast({
        body: e instanceof Error ? e.message : '删除失败',
        type: 'error',
      });
    }
  };

  return (
    <VStack gap={3}>
      <VStack gap={0.5}>
        <Heading level={5}>{meta.title}</Heading>
        <Text size="2xs" color="secondary">
          {meta.subtitle}
        </Text>
      </VStack>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <VStack gap={2}>
          <TextInput
            label="名称"
            placeholder={meta.namePlaceholder}
            value={name}
            onChange={setName}
            width="100%"
            hasAutoFocus
          />
          {widgetKey === 'countdown' && (
            <VStack gap={1.5}>
              <Text size="2xs" color="secondary" weight="medium">
                循环
              </Text>
              <SegmentedControl
                label="循环粒度"
                value={recurUnit}
                onChange={(v: string) => {
                  const unit = v as '' | RecurUnit;
                  setRecurUnit(unit);
                  // 循环模式下选择器退化为部分维度，先补锚点避免空值
                  if (unit && !date) setDate(formatDate(new Date()));
                }}
                layout="fill"
                size="sm"
              >
                <SegmentedControlItem value="" label="不循环" />
                <SegmentedControlItem value="week" label="每周" />
                <SegmentedControlItem value="month" label="每月" />
                <SegmentedControlItem value="year" label="每年" />
              </SegmentedControl>
            </VStack>
          )}
          <RecurDatePicker
            recurUnit={widgetKey === 'countdown' ? recurUnit : ''}
            date={date}
            onChange={setDate}
            dateLabel={meta.dateLabel}
          />

          {error && (
            <Text size="sm" className="text-danger" role="alert">
              {error}
            </Text>
          )}

          <div className="flex justify-end gap-2">
            {primaryItem && (
              <Button
                label="删除"
                variant="ghost"
                size="sm"
                onClick={() => void handleDelete(primaryItem)}
                isDisabled={submitting}
              />
            )}
            {primaryItem && (
              <Button
                label="取消"
                variant="ghost"
                size="sm"
                onClick={onDone}
                isDisabled={submitting}
              />
            )}
            <Button
              label={primaryItem ? '保存修改' : '保存日期'}
              variant="primary"
              size="sm"
              icon={primaryItem ? undefined : <Plus size={14} />}
              type="submit"
              isLoading={submitting}
              isDisabled={submitting}
            />
          </div>
        </VStack>
      </form>

      {confirmDialog.element}
    </VStack>
  );
}
