import { Text } from '@astryxdesign/core/Text';
import type { ReactNode } from 'react';

interface EmptyPlaceholderProps {
  label: string;
  hint?: string;
  icon?: ReactNode;
  /** 提供则渲染为可点击按钮（上传类空态） */
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * 虚线空态占位（设置页统一骨架）。
 * 首页 EmptyState（插画 + 操作按钮）、widget 栏空态、日期 widget 空态
 * 为各自场景的富变体，不在本组件范围。
 */
export function EmptyPlaceholder({
  label,
  hint,
  icon,
  onClick,
  disabled,
}: EmptyPlaceholderProps) {
  const body = (
    <>
      {icon && (
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent"
        >
          {icon}
        </span>
      )}
      <Text size="sm" weight="medium">
        {label}
      </Text>
      {hint && (
        <Text size="2xs" color="secondary">
          {hint}
        </Text>
      )}
    </>
  );

  const shell =
    'flex w-full flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-border bg-surface-2/40 px-4 py-8 text-center transition-colors';

  if (!onClick) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${shell} cursor-pointer hover:border-accent/60 hover:bg-surface-2/80 focus-ring disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {body}
    </button>
  );
}
