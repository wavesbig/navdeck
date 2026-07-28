import { Text } from '@astryxdesign/core/Text';
import { CategoryIcon } from '@/lib/categoryIcons';

interface CategoryBadgeProps {
  /** 分类名（用于无图标时取首字母占位） */
  name: string;
  /** 图标名（kebab-case） */
  icon?: string | null;
  /** 颜色（hex） */
  color?: string | null;
}

/** 将 hex 色转为 18% 不透明度的 rgba 淡色背景 */
function hexToRgba(hex: string, alpha: number): string | null {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 分类徽章（Heimdall 范式克制版）
 *
 * 视觉策略：color 作淡色背景（18% 不透明度），icon 保持原色居中
 * - 有 icon：color 淡底 + 原色 icon；无 color 时主题背景 + 主题色 icon
 * - 无 icon 有 color：color 淡底 + 首字母用 color 原色
 * - 无 icon 无 color：主题背景 + 主题色首字母
 *
 * 尺寸固定 32px，icon 18px 居中。
 * 唯一动态值是 backgroundColor（用户强调色派生的淡色），无 token 可对应。
 */
export function CategoryBadge({ name, icon, color }: CategoryBadgeProps) {
  const hasIcon = Boolean(icon);
  const tintedBg = color ? hexToRgba(color, 0.18) : null;
  const fgColor = color ?? undefined; // 无色时继承 currentColor

  return (
    <span
      className="inline-flex items-center justify-center rounded-lg shrink-0 size-8 border border-border overflow-hidden"
      style={tintedBg ? { backgroundColor: tintedBg } : undefined}
      aria-hidden
    >
      {hasIcon ? (
        <CategoryIcon name={icon} size={18} color={fgColor} />
      ) : (
        <Text
          size="sm"
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
