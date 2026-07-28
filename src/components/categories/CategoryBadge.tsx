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
 * 视觉策略：icon 优先展示，color 作为辅助装饰
 * - 有 icon：主题背景 + 主题色图标（保持图标原色清晰），color 作右上角小色点
 * - 无 icon 有 color：带色背景 + 白色首字母
 * - 无 icon 无 color：主题背景 + 主题色首字母
 *
 * 尺寸固定 32px，字号 sm，与列表行视觉对齐。
 * 唯一动态值是 backgroundColor / 右上角色点（用户选的强调色），无 token 可对应。
 */
export function CategoryBadge({ name, icon, color }: CategoryBadgeProps) {
  const hasIcon = Boolean(icon);

  return (
    <span className="relative inline-flex items-center justify-center rounded-lg shrink-0 size-8 border border-border overflow-hidden">
      {hasIcon ? (
        <>
          {/* 图标保持主题色，优先展示 */}
          <CategoryIcon name={icon} size={16} />
          {/* 颜色作为右上角小色点装饰，辅助识别 */}
          {color && (
            <span
              className="absolute top-0.5 right-0.5 size-1.5 rounded-full border border-surface"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          )}
        </>
      ) : color ? (
        // 无图标有颜色：带色背景 + 白色首字母
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: color }}
          aria-hidden
        >
          <Text
            size="sm"
            weight="semibold"
            style={{ color: '#FFFFFF' }}
          >
            {(name || '?').charAt(0).toUpperCase()}
          </Text>
        </span>
      ) : (
        // 无图标无颜色：主题背景 + 主题色首字母
        <Text size="sm" weight="semibold" color="secondary">
          {(name || '?').charAt(0).toUpperCase()}
        </Text>
      )}
    </span>
  );
}
