'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_GROUPS,
  CategoryIcon,
} from '@/lib/categoryIcons';

interface CategoryIconPickerProps {
  /** 当前图标名（kebab-case，空字符串表示未选） */
  value: string;
  onChange: (value: string) => void;
}

/**
 * 分类图标选择器
 *
 * - 预选 66 个 lucide 图标，按 9 个分组展示
 * - 支持按图标名 / label / 拼音搜索（拼音由 label 匹配简化为子串匹配）
 * - 点击图标直接选中并关闭浮层
 */
export function CategoryIconPicker({
  value,
  onChange,
}: CategoryIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  // 过滤图标：按 name / label 子串匹配
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.label.toLowerCase().includes(q),
    );
  }, [query]);

  // 按 group 分组
  const grouped = useMemo(() => {
    const map = new Map<string, typeof CATEGORY_ICONS>();
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)?.push(item);
    }
    return CATEGORY_ICON_GROUPS.map((g) => ({
      group: g,
      items: map.get(g) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <HStack gap={2} align="center" width="100%">
      {/* 触发器：当前图标色块 */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="size-9 rounded-md border border-border bg-surface flex items-center justify-center hover:bg-overlay-hover transition-colors shrink-0"
        aria-label="选择图标"
        title={value || '未选择图标'}
      >
        <CategoryIcon name={value} size={18} />
      </button>

      {/* 当前图标名显示 */}
      <Text size="sm" color={value ? 'primary' : 'secondary'} className="flex-1">
        {value || '未选择'}
      </Text>

      {/* 清除按钮 */}
      {value && (
        <IconButton
          label="清除图标"
          tooltip="清除"
          variant="ghost"
          size="sm"
          icon={<X size={14} />}
          onClick={() => onChange('')}
        />
      )}

      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="below"
        width={340}
        content={
          <VStack gap={2} className="p-3">
            <Text size="sm" weight="medium">
              选择图标
            </Text>
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
    </HStack>
  );
}
