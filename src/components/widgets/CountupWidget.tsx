'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useDateItems } from '@/hooks/useDateItems';
import { daysSince, formatDate } from '@/lib/datetime';
import type { DateItem } from '@/types';

/**
 * 正数日 widget
 */
export function CountupWidget() {
  const { items, isLoading, addItem, deleteItem } = useDateItems('countup');
  const [configOpen, setConfigOpen] = useState(false);

  const sorted = [...items]
    .map((it) => ({
      ...it,
      days: daysSince(new Date(it.date)),
    }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  return (
    <Card>
      <VStack gap={2}>
        <div className="flex gap-2 items-center justify-between">
          <Heading level={5}>正数日</Heading>
          <Popover
            isOpen={configOpen}
            onOpenChange={setConfigOpen}
            placement="end"
            alignment="end"
            width={320}
            label="配置正数日"
            content={
              <ConfigPanel
                items={items}
                onAdd={addItem}
                onDelete={deleteItem}
              />
            }
          >
            <IconButton
              label="配置正数日"
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
            点击齿轮添加正数日
          </Text>
        ) : (
          <VStack gap={1}>
            {sorted.map((item) => (
              <CountupRow key={item.id} item={item} />
            ))}
          </VStack>
        )}
      </VStack>
    </Card>
  );
}

function CountupRow({ item }: { item: DateItem & { days: number } }) {
  return (
    <div className="flex gap-2 items-center justify-between">
      <VStack gap={0} className="min-w-0 flex-1">
        <Text size="sm" weight="medium" className="truncate">
          {item.name}
        </Text>
        <Text size="2xs" color="secondary">
          {formatDate(new Date(item.date))}
        </Text>
      </VStack>
      <VStack gap={0} className="items-end">
        <span className="text-lg font-semibold tabular-nums text-accent">
          {item.days}
        </span>
        <Text size="2xs" color="secondary">
          天
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
      await onAdd({ name: name.trim(), date });
      setName('');
      setDate('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失败');
    } finally {
      setAdding(false);
    }
  };

  return (
    <VStack gap={3}>
      <Heading level={5}>管理正数日</Heading>

      <VStack gap={2}>
        <Field label="名称">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：在一起的日子"
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-base focus:outline-none focus:border-accent"
          />
        </Field>
        <Field label="起始日期">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-base focus:outline-none focus:border-accent"
          />
        </Field>

        {error && <span className="text-sm text-danger">{error}</span>}

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <VStack gap={1}>
      <Text size="2xs" color="secondary">
        {label}
      </Text>
      {children}
    </VStack>
  );
}
