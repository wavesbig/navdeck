'use client';

import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Search, Shapes, X } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import {
  CATEGORY_ICON_GROUPS,
  CATEGORY_ICONS,
  CategoryIcon,
} from '@/lib/category-icons';

interface CategoryIconPickerProps {
  /** 当前图标名（kebab-case，空字符串表示未选） */
  value: string;
  onChange: (value: string) => void;
  /** 自定义触发器；提供则替代默认 IconButton，点击打开 Popover */
  trigger?: ReactNode;
  /** 自定义触发器的 aria-label */
  triggerLabel?: string;
}

/**
 * 分类图标选择器
 *
 * - 默认形态：IconButton 触发 Popover
 * - trigger 形态：父组件传入自定义节点（如 CategoryBadge），包一层 button 触发 Popover
 *
 * 预览由父组件统一渲染（trigger 模式下预览即触发器，直接操作）。
 */
export function CategoryIconPicker({
  value,
  onChange,
  trigger,
  triggerLabel,
}: CategoryIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter(
      (i) =>
        i.name.toLowerCase().includes(q) || i.label.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof CATEGORY_ICONS>();
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)?.push(item);
    }
    const result: { group: string; items: typeof CATEGORY_ICONS }[] = [];
    for (const g of CATEGORY_ICON_GROUPS) {
      const items = map.get(g);
      if (items && items.length > 0) result.push({ group: g, items });
    }
    return result;
  }, [filtered]);

  const triggerNode = trigger ? (
    <button
      type="button"
      aria-label={
        triggerLabel ?? (value ? `更换图标（当前：${value}）` : '选择图标')
      }
      title={value ? '点击更换图标' : '点击选择图标'}
      className="cursor-pointer rounded-lg transition-[transform,box-shadow] hover:ring-2 hover:ring-border hover:ring-offset-2 hover:ring-offset-surface active:scale-95"
      onClick={() => setIsOpen(true)}
    >
      {trigger}
    </button>
  ) : (
    <IconButton
      label={value ? `更换图标（当前：${value}）` : '选择图标'}
      tooltip={value ? '更换图标' : '选择图标'}
      variant="secondary"
      size="sm"
      icon={<Shapes size={14} />}
      onClick={() => setIsOpen(true)}
    />
  );

  return (
    <>
      {triggerNode}

      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="below"
        width={340}
        label="选择分类图标"
        content={
          <VStack gap={2} className="p-3">
            <div className="flex items-center justify-between">
              <Text size="sm" weight="medium">
                选择图标
              </Text>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-secondary hover:border-danger hover:text-danger hover:bg-danger/5 transition-colors text-xs"
                  aria-label="清除图标"
                >
                  <X size={12} />
                  清除
                </button>
              )}
            </div>
            <TextInput
              label="搜索图标"
              isLabelHidden
              placeholder="搜索图标名…"
              value={query}
              onChange={setQuery}
              width="100%"
              startIcon={<Search size={14} />}
            />

            <div className="max-h-[320px] overflow-y-auto -mx-1 px-1">
              {grouped.length === 0 ? (
                <Text size="sm" color="secondary" className="py-4 text-center">
                  未找到匹配的图标
                </Text>
              ) : (
                <VStack gap={2}>
                  {grouped.map(({ group, items }) => (
                    <div key={group}>
                      <Text
                        size="2xs"
                        color="secondary"
                        weight="medium"
                        className="px-1 mb-1 block"
                      >
                        {group}
                      </Text>
                      <div className="grid grid-cols-7 gap-1">
                        {items.map((item) => {
                          const selected = value === item.name;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => {
                                onChange(item.name);
                                setIsOpen(false);
                              }}
                              title={`${item.label} (${item.name})`}
                              className={`size-9 rounded-md flex items-center justify-center border transition-colors ${
                                selected
                                  ? 'border-primary bg-overlay-active'
                                  : 'border-transparent hover:border-border hover:bg-overlay-hover'
                              }`}
                            >
                              <CategoryIcon name={item.name} size={16} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </VStack>
              )}
            </div>
          </VStack>
        }
      />
    </>
  );
}
