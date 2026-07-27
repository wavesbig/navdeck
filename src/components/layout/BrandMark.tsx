import type { ReactNode } from 'react';

interface BrandMarkProps {
  /** 尺寸预设
   * - sm: 20px（搜索框内放大镜位置）
   * - md: 32px（默认，FloatingLogo 用）
   */
  size?: 'sm' | 'md';
  /** 自定义容器 className（覆盖默认样式时使用） */
  className?: string;
  /** 可访问性标签，默认 "NavDeck" */
  'aria-label'?: string;
  /** 内部字符，默认 "N" */
  children?: ReactNode;
}

/** 尺寸预设对应的 Tailwind 类 */
const SIZE_CLASSES: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-8 h-8 text-base',
};

/**
 * NavDeck 品牌标记（N 字色块）
 *
 * - 不带文字，仅 N 字色块，作为品牌视觉锚点
 * - FloatingLogo 用 md 尺寸 + 文字组合
 * - SearchBox 用 sm 尺寸替代放大镜图标，强化品牌感
 *
 * 视觉规范：
 * - 圆角 rounded-lg（与 Card 默认 container 圆角一致 = 12px）
 * - accent 背景 + on-accent 文字
 * - 字重 bold，居中
 */
export function BrandMark({
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'NavDeck',
  children = 'N',
}: BrandMarkProps) {
  return (
    <span
      aria-label={ariaLabel}
      role="img"
      className={`inline-flex items-center justify-center rounded-lg bg-accent text-on-accent font-bold shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </span>
  );
}
