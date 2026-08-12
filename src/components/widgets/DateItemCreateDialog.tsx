'use client';

import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { RecurDatePicker } from '@/components/widgets/RecurDatePicker';
import { formatDate, type RecurUnit } from '@/lib/datetime';

interface DateItemCreateDialogProps {
  /** 待创建的 widget 类型；null 表示弹窗关闭 */
  widgetKey: 'countdown' | 'countup' | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    name: string;
    date: string;
    recurUnit?: RecurUnit | null;
  }) => Promise<void>;
}

/**
 * 新增日期卡片的独立表单弹窗
 *
 * 「先填日期再出卡片」：从 widget 库添加倒数日/正数日时不先创建空实例，
 * 表单保存成功后才创建实例 + 日期项；取消则什么都不发生。
 */
export function DateItemCreateDialog({
  widgetKey,
  onOpenChange,
  onSubmit,
}: DateItemCreateDialogProps) {
  return (
    <Dialog
      isOpen={widgetKey !== null}
      onOpenChange={onOpenChange}
      width={320}
      purpose="info"
      aria-label={widgetKey === 'countup' ? '添加正数日' : '添加倒数日'}
    >
      {/* 关闭（widgetKey=null）即卸载表单，下次打开是全新 state，
          不需要 effect 监听 prop 变化做重置 */}
      {widgetKey && (
        <CreateForm
          widgetKey={widgetKey}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

interface CreateFormProps {
  widgetKey: 'countdown' | 'countup';
  onOpenChange: (open: boolean) => void;
  onSubmit: DateItemCreateDialogProps['onSubmit'];
}

function CreateForm({ widgetKey, onOpenChange, onSubmit }: CreateFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  /** '' 表示不循环（仅倒数日可用） */
  const [recurUnit, setRecurUnit] = useState<'' | RecurUnit>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCountdown = widgetKey === 'countdown';

  const handleSubmit = async () => {
    if (!name.trim() || !date) {
      setError('请填写名称和日期');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        date,
        ...(isCountdown ? { recurUnit: recurUnit || null } : {}),
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VStack gap={3}>
      <VStack gap={0.5}>
        <Heading level={5}>{isCountdown ? '添加倒数日' : '添加正数日'}</Heading>
        <Text size="2xs" color="secondary">
          保存后卡片才会出现在 widget 栏。
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
            placeholder={isCountdown ? '如：发工资' : '如：在一起'}
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
                  // 循环模式下日期选择器退化为部分维度，先补一个锚点避免空值
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
          />

          {error && (
            <Text size="sm" className="text-danger" role="alert">
              {error}
            </Text>
          )}

          <div className="flex justify-end gap-2">
            <Button
              label="取消"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              isDisabled={submitting}
            />
            <Button
              label="添加"
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              type="submit"
              isLoading={submitting}
              isDisabled={submitting}
            />
          </div>
        </VStack>
      </form>
    </VStack>
  );
}
