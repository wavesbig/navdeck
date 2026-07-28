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

/**
 * 分类徽章
 *
 * 列表/网格中分类的视觉锚点，始终渲染保持对齐：
 * - 有 icon + color：带色背景 + 白色图标
 * - 有 icon 无 color：主题 surface 背景 + 主题色图标
 * - 无 icon 有 color：带色背景 + 白色首字母
 * - 无 icon 无 color：主题 surface 背景 + 主题色首字母
 *
 * 尺寸固定 32px，字号 sm，与列表行视觉对齐。
 * 唯一动态值是 backgroundColor（用户选的强调色），无 token 可对应。
 */
export function CategoryBadge({ name, icon, color }: CategoryBadgeProps) {
  const hasIcon = Boolean(icon);
  const fgColor = color ?? undefined; // 无色时继承 currentColor

  return (
    <span
      className="inline-flex items-center justify-center rounded-lg shrink-0 size-8 border border-border overflow-hidden"
      style={color ? { backgroundColor: color } : undefined}
      aria-hidden
    >
      {hasIcon ? (
        <CategoryIcon name={icon} size={16} color={fgColor} />
      ) : (
        <Text
          size="sm"
          weight="semibold"
          color={color ? undefined : 'secondary'}
          style={color ? { color: '#FFFFFF' } : undefined}
        >
          {(name || '?').charAt(0).toUpperCase()}
        </Text>
      )}
    </span>
  );
}
