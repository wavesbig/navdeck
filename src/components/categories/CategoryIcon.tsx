import { ICON_MAP } from '@/lib/category-icons';

export interface CategoryIconProps {
  /** kebab-case 图标名（DB 中存储的值） */
  name: string | null | undefined;
  /** 图标尺寸，默认 16 */
  size?: number;
  /** 颜色，默认继承 currentColor */
  color?: string;
  className?: string;
}

/**
 * 渲染分类图标
 *
 * - name 为空返回 null
 * - 未知 name 也返回 null（不会渲染占位）
 */
export function CategoryIcon({
  name,
  size = 16,
  color,
  className,
}: CategoryIconProps) {
  if (!name) return null;
  const Cmp = ICON_MAP[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} className={className} />;
}
