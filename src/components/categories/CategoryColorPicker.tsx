'use client';

import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Check, Palette, X } from 'lucide-react';
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
 * 分类颜色选择器（紧凑触发器版）
 *
 * 触发器只保留一个 IconButton，预览由父组件 CategoryBadge 统一渲染。
 */
export function CategoryColorPicker({
  value,
  onChange,
}: CategoryColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <IconButton
          label={value ? `更换颜色（当前：${value}）` : '选择颜色'}
          tooltip={value ? '更换颜色' : '选择颜色'}
          variant="secondary"
          size="sm"
          icon={
            value ? (
              <span
                className="size-3.5 rounded-sm border border-border"
                style={{ backgroundColor: value }}
                aria-hidden
              />
            ) : (
              <Palette size={14} />
            )
          }
          onClick={() => setIsOpen(true)}
        />
        {value && (
          <IconButton
            label="清除颜色"
            tooltip="清除"
            variant="ghost"
            size="sm"
            icon={<X size={12} />}
            onClick={() => onChange('')}
          />
        )}
      </div>

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
            <label
              htmlFor="category-color-input"
              className="flex items-center gap-2 cursor-pointer mt-1"
              title="自定义颜色"
            >
              <span
                className="size-8 rounded-md border border-border bg-surface flex items-center justify-center hover:bg-overlay-hover transition-colors"
                style={{
                  backgroundColor: value || 'transparent',
                  backgroundImage:
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
                }}
              />
              <Text size="sm" color="secondary">
                自定义
              </Text>
            </label>
            <input
              id="category-color-input"
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="sr-only"
            />
          </VStack>
        }
      />
    </>
  );
}
