import { Text } from '@astryxdesign/core/Text';
import { CategoryIcon } from '@/lib/category-icons';

interface CategoryBadgeProps {
  /** 分类名（用于无图标时取首字母占位） */
  name: string;
  /** 图标名（kebab-case） */
  icon?: string | null;
  /** 颜色（hex） */
  color?: string | null;
  /** 徽章尺寸
   *  - sm (24px)：主页标题前
   *  - md (32px)：设置列表行
   *  - lg (40px)：编辑预览
   */
  size?: 'sm' | 'md' | 'lg';
}

/** 将 hex 色转为指定不透明度的 rgba */
function hexToRgba(hex: string, alpha: number): string | null {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const SIZE_MAP = {
  sm: { box: 'size-6 rounded-md', icon: 14 },
  md: { box: 'size-8 rounded-lg', icon: 18 },
  lg: { box: 'size-10 rounded-lg', icon: 20 },
} as const;

/**
 * 分类徽章
 *
 * 视觉策略（Linear/Notion 范式融合）：
 * - color 转 18% 不透明度淡色背景
 * - icon 保持原色居中
 * - 无 icon 有 color：color 淡底 + 首字母用 color 原色
 * - 无 icon 无 color：主题背景 + 主题色首字母
 *
 * 尺寸梯度（shape consistency lock，rounded-lg 系列）：
 * - sm (24px)：主页标题前
 * - md (32px)：设置列表行
 * - lg (40px)：编辑预览
 *
 * 唯一动态值是 backgroundColor（用户强调色派生的淡色）。
 */
export function CategoryBadge({
  name,
  icon,
  color,
  size = 'md',
}: CategoryBadgeProps) {
  const hasIcon = Boolean(icon);
  const tintedBg = color ? hexToRgba(color, 0.18) : null;
  // 用 || 而非 ??：空字符串也要回退到 undefined，否则 lucide stroke="" 图标不可见
  const fgColor = color || undefined;
  const { box, icon: iconSize } = SIZE_MAP[size];

  return (
    <span
      className={`inline-flex items-center justify-center text-primary ${box} shrink-0 border border-border overflow-hidden`}
      style={tintedBg ? { backgroundColor: tintedBg } : undefined}
      aria-hidden
    >
      {hasIcon ? (
        <CategoryIcon name={icon} size={iconSize} color={fgColor} />
      ) : (
        <Text
          size={size === 'lg' ? 'base' : 'xsm'}
          weight="semibold"
          color={color ? undefined : 'secondary'}
          style={color ? { color } : undefined}
        >
          {(name || '?').charAt(0).toUpperCase()}
        </Text>
      )}
    </span>
  );
}
