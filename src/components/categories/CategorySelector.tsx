'use client';

import type { FieldStatusInput } from '@astryxdesign/core/Field';
import { Selector } from '@astryxdesign/core/Selector';
import type { Category } from '@/types';

interface CategorySelectorProps {
  categories: Category[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  isOptional?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  status?: FieldStatusInput;
}

/**
 * 分类选择器
 *
 * 使用 Astryx Selector 保持表单控件样式与交互一致。
 */
export function CategorySelector({
  categories,
  value,
  onChange,
  label = '分类',
  description,
  isOptional,
  isRequired,
  isDisabled,
  status,
}: CategorySelectorProps) {
  const options = [
    { value: '', label: '未分类' },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  return (
    <Selector
      label={label}
      options={options}
      value={value ?? ''}
      onChange={onChange}
      placeholder="选择分类"
      description={description}
      isOptional={isOptional}
      isRequired={isRequired}
      isDisabled={isDisabled}
      status={status}
      width="100%"
    />
  );
}
