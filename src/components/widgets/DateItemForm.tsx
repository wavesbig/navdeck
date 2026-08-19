'use client';

import { Button } from '@astryxdesign/core/Button';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { RecurDatePicker } from '@/components/widgets/RecurDatePicker';
import { formatDate, type RecurUnit } from '@/lib/datetime';

export type DateWidgetKey = 'countdown' | 'countup';

export interface DateItemFormInput {
  name: string;
  date: string;
  recurUnit?: RecurUnit | null;
}

interface DateItemFormProps {
  /** 决定循环设置是否可用（循环仅倒数日支持） */
  widgetKey: DateWidgetKey;
  /** 编辑场景传入预填值；新增省略 */
  initial?: DateItemFormInput;
  namePlaceholder: string;
  dateLabel: string;
  requiredHint: string;
  submitLabel: string;
  /** 提交成功后调用（通常是关闭弹窗） */
  onSubmit: (input: DateItemFormInput) => Promise<void>;
  onSuccess: () => void;
  onCancel?: () => void;
  /** 提交按钮前的额外操作（如「删除」） */
  extraActions?: ReactNode;
}

/**
 * 倒数日 / 正数日共用的日期表单
 *
 * 新增（AddWidgetDialog 第二步）与编辑（DateItemConfigPanel）复用：
 * 名称 / 日期 / 循环字段、校验、提交态与错误提示完全一致，
 * 差异（预填、删除、文案）通过 props 注入。
 */
export function DateItemForm({
  widgetKey,
  initial,
  namePlaceholder,
  dateLabel,
  requiredHint,
  submitLabel,
  onSubmit,
  onSuccess,
  onCancel,
  extraActions,
}: DateItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  /** '' 表示不循环（仅倒数日可编辑） */
  const [recurUnit, setRecurUnit] = useState<'' | RecurUnit>(
    initial?.recurUnit ?? '',
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCountdown = widgetKey === 'countdown';

  const handleSubmit = async () => {
    if (!name.trim() || !date) {
      setError(requiredHint);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // 循环字段仅倒数日提交（正数日带 recurUnit 会被服务端拒绝）
      await onSubmit({
        name: name.trim(),
        date,
        ...(isCountdown ? { recurUnit: recurUnit || null } : {}),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <VStack gap={3}>
        <TextInput
          label="名称"
          placeholder={namePlaceholder}
          value={name}
          onChange={setName}
          width="100%"
          hasAutoFocus
        />
        {isCountdown && (
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
                // 循环模式下日期选择器退化为部分维度，先补锚点避免空值
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
          recurUnit={isCountdown ? recurUnit : ''}
          date={date}
          onChange={setDate}
          dateLabel={dateLabel}
        />

        {error && (
          <Text size="sm" className="text-danger" role="alert">
            {error}
          </Text>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {extraActions}
          {onCancel && (
            <Button
              label="取消"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              isDisabled={submitting}
            />
          )}
          <Button
            label={submitLabel}
            variant="primary"
            size="sm"
            icon={initial ? undefined : <Plus size={14} />}
            type="submit"
            isLoading={submitting}
            isDisabled={submitting}
          />
        </div>
      </VStack>
    </form>
  );
}
