'use client';

import { Button } from '@astryxdesign/core/Button';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { Card } from '@astryxdesign/core/Card';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Heading } from '@astryxdesign/core/Heading';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useDateItems } from '@/hooks/useDateItems';
import { daysUntil, formatDate } from '@/lib/datetime';
import type { DateItem } from '@/types';

/**
 * 倒数日 widget
 */
export function CountdownWidget() {
  const { items, isLoading, addItem, deleteItem } = useDateItems('countdown');
  const [configOpen, setConfigOpen] = useState(false);

  const sorted = [...items]
    .map((it) => {
      const target = new Date(it.date);
      const { days } = daysUntil(target);
      return { ...it, days };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  return (
    <Card>
      <VStack gap={2}>
        <div className="flex gap-2 items-center justify-between">
          <Heading level={5}>倒数日</Heading>
          <Popover
            isOpen={configOpen}
            onOpenChange={setConfigOpen}
            placement="end"
            alignment="end"
            width={320}
            label="配置倒数日"
            content={
              <ConfigPanel
                items={items}
                onAdd={addItem}
                onDelete={deleteItem}
              />
            }
          >
            <IconButton
              label="配置倒数日"
              icon={<Settings size={14} />}
              variant="ghost"
              tooltip="配置"
            />
          </Popover>
        </div>

        {isLoading ? (
          <Text size="sm" color="secondary">
            加载中…
          </Text>
        ) : sorted.length === 0 ? (
          <Text size="sm" color="secondary">
            点击齿轮添加倒数日
          </Text>
        ) : (
          <VStack gap={1}>
            {sorted.map((item) => (
              <CountdownRow key={item.id} item={item} />
            ))}
          </VStack>
        )}
      </VStack>
    </Card>
  );
}

function CountdownRow({ item }: { item: DateItem & { days: number } }) {
  const isPast = item.days < 0;
  const days = Math.abs(item.days);
  const date = new Date(item.date);
  const targetLabel = item.recurring
    ? `${formatDate(date)} · 每年`
    : formatDate(date);

  return (
    <div className="flex gap-2 items-center justify-between">
      <VStack gap={0} className="min-w-0 flex-1">
        <Text size="sm" weight="medium" className="truncate">
          {item.name}
        </Text>
        <Text size="2xs" color="secondary">
          {targetLabel}
        </Text>
      </VStack>
      <VStack gap={0} className="items-end">
        <span
          className={`text-lg font-semibold tabular-nums ${
            isPast ? 'text-secondary' : 'text-accent'
          }`}
        >
          {days}
        </span>
        <Text size="2xs" color="secondary">
          {isPast ? '天前' : '天后'}
        </Text>
      </VStack>
    </div>
  );
}

function ConfigPanel({
  items,
  onAdd,
  onDelete,
}: {
  items: DateItem[];
  onAdd: (input: {
    name: string;
    date: string;
    recurring?: boolean;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !date) {
      setError('请填写名称和日期');
      return;
    }
    setAdding(true);
    setError('');
    try {
      await onAdd({ name: name.trim(), date, recurring });
      setName('');
      setDate('');
      setRecurring(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失败');
    } finally {
      setAdding(false);
    }
  };

  return (
    <VStack gap={3}>
      <Heading level={5}>管理倒数日</Heading>

      <VStack gap={2}>
        <TextInput
          label="名称"
          placeholder="如：春节"
          value={name}
          onChange={setName}
          width="100%"
        />
        <DateInput
          label="日期"
          value={(date || undefined) as ISODateString | undefined}
          onChange={(v) => setDate(v ?? '')}
        />
        <Switch label="每年循环" value={recurring} onChange={setRecurring} />

        {error && (
          <Text size="sm" className="text-danger" role="alert">
            {error}
          </Text>
        )}

        <Button
          label="添加"
          variant="primary"
          icon={<Plus size={14} />}
          onClick={handleAdd}
          isLoading={adding}
          isDisabled={adding}
        />
      </VStack>

      {items.length > 0 && (
        <VStack gap={1}>
          <Text size="2xs" color="secondary">
            已有项
          </Text>
          {items.map((it) => (
            <div
              key={it.id}
              className="flex gap-2 items-center justify-between"
            >
              <Text size="sm" className="truncate flex-1">
                {it.name}
              </Text>
              <Text size="2xs" color="secondary">
                {formatDate(new Date(it.date))}
              </Text>
              <IconButton
                label="删除"
                icon={<Trash2 size={12} />}
                variant="ghost"
                onClick={() => void onDelete(it.id)}
              />
            </div>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
