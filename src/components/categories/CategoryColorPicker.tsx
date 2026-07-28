'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Check, X } from 'lucide-react';
import { useState } from 'react';

/** 预设色板：低饱和、适合分类标识 */
const PRESET_COLORS = [
  '#EF4444', // 红
  '#F97316', // 橙
  '#EAB308', // 黄
  '#22C55E', // 绿
  '#06B6D4', // 青
  '#3B82F6', // 蓝
  '#8B5CF6', // 紫
  '#EC4899', // 粉
  '#64748B', // 灰
];

interface CategoryColorPickerProps {
  /** 当前颜色（hex 字符串，空字符串表示未选） */
  value: string;
  onChange: (value: string) => void;
}

/**
 * 分类颜色选择器
 *
 * - 预设色板：9 个常用颜色快速点选
 * - 自定义色：浏览器原生 <input type="color">
 * - 清除：清除已选颜色
 */
export function CategoryColorPicker({
  value,
  onChange,
}: CategoryColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HStack gap={2} align="center" width="100%">
      {/* 当前颜色色块（触发器） */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="size-9 rounded-md border border-border bg-surface flex items-center justify-center hover:bg-overlay-hover transition-colors shrink-0"
        aria-label="选择颜色"
        title={value || '未选择颜色'}
      >
        {value ? (
          <span
            className="size-5 rounded"
            style={{ backgroundColor: value }}
            aria-hidden
          />
        ) : (
          <span className="size-5 rounded border border-dashed border-border" />
        )}
      </button>

      {/* 当前 hex 值显示 */}
      <Text size="sm" color={value ? 'primary' : 'secondary'} className="flex-1">
        {value || '未选择'}
      </Text>

      {/* 清除按钮 */}
      {value && (
        <IconButton
          label="清除颜色"
          tooltip="清除"
          variant="ghost"
          size="sm"
          icon={<X size={14} />}
          onClick={() => onChange('')}
        />
      )}

      {/* 浮层：预设色板 + 自定义色 */}
      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="below"
        width={260}
        content={
          <VStack gap={2} className="p-3">
            <Text size="sm" weight="medium">
              选择颜色
            </Text>

            {/* 预设色板 */}
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    onChange(color);
                    setIsOpen(false);
                  }}
                  title={color}
                  className="size-8 rounded-md border border-border hover:scale-105 transition-transform flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  {value.toLowerCase() === color.toLowerCase() && (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>

            {/* 自定义颜色：原生 color input */}
            <HStack gap={2} align="center" className="mt-1">
              <label
                htmlFor="category-color-input"
                className="cursor-pointer size-8 rounded-md border border-border bg-surface flex items-center justify-center hover:bg-overlay-hover transition-colors"
                title="自定义颜色"
              >
                <span
                  className="size-5 rounded"
                  style={{
                    backgroundColor: value || 'transparent',
                    backgroundImage:
                      'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
                  }}
                />
              </label>
              <input
                id="category-color-input"
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                className="sr-only"
              />
              <Text size="sm" color="secondary">
                自定义
              </Text>
            </HStack>
          </VStack>
        }
      />
    </HStack>
  );
}
