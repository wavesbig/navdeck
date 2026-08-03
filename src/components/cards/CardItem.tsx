import { Card } from '@astryxdesign/core/Card';
import { ContextMenu } from '@astryxdesign/core/ContextMenu';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { StatusDot } from '@/components/cards/StatusDot';
import type { CardStatus, Card as CardType } from '@/types';

interface CardItemProps {
  card: CardType;
  status?: CardStatus;
  /** 点击卡片跳转的 URL（由父组件根据网络模式决定） */
  href: string;
  /** 点击卡片时触发（fire-and-forget 单卡片探测） */
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /**
   * 是否可交互（默认 true）。
   * 排序模式下传 false：禁用 <a> 点击跳转、右键菜单与状态探测，
   * 改为 cursor-grab 让用户知道卡片可拖拽。
   */
  interactive?: boolean;
}

/**
 * 单个服务卡片
 *
 * 视觉规范（ui-spec §4.5）：
 * - 卡片本体 80×80px（仅图标 + 右上角状态灯）
 * - 标题在卡片下方独立区域
 * - 圆角 rounded-xl（20px，Tally 软圆角）
 * - 边框 hair + 背景 paper-1
 * - hover：上浮 -2px + 阴影
 * - 状态灯 8px 圆点在右上角
 * - 标题 13px / 字重 500，最多 2 行（line-clamp-2，长名字如 Audiobookshelf 可完整显示）
 *
 * 交互：
 * - 左键点击 → 新标签页打开 href
 * - 右键 → ContextMenu（打开 / 编辑 / 删除），替代之前的 hover 浮层按钮
 *   好处：不占用卡片视觉空间，避免误触，符合桌面端操作习惯
 */
export function CardItem({
  card,
  status = 'unknown',
  href,
  onClick,
  onEdit,
  onDelete,
  interactive = true,
}: CardItemProps) {
  // 构造右键菜单 items（仅当至少一个回调存在时才启用）
  const items =
    interactive && (onEdit || onDelete)
      ? [
          {
            label: '在新标签页打开',
            icon: <ExternalLink size={14} />,
            onClick: () => {
              window.open(href, '_blank', 'noopener,noreferrer');
            },
          },
          ...(onEdit
            ? [
                {
                  label: '编辑',
                  icon: <Pencil size={14} />,
                  onClick: onEdit,
                },
              ]
            : []),
          { type: 'divider' as const },
          ...(onDelete
            ? [
                {
                  label: '删除',
                  icon: <Trash2 size={14} />,
                  onClick: onDelete,
                },
              ]
            : []),
        ]
      : [];

  const cardContent = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={interactive ? onClick : (e) => e.preventDefault()}
      className={`group inline-flex flex-col items-center gap-1.5 w-[80px] focus:outline-none ${interactive ? '' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <Card
        width={80}
        height={80}
        padding={0}
        className="relative overflow-hidden transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-accent"
      >
        {/* 右上角状态灯 */}
        <span className="absolute top-1.5 right-1.5 z-10">
          <StatusDot status={status} />
        </span>

        {/* 图标居中 */}
        <div className="w-full h-full flex items-center justify-center p-2.5">
          <IconOrPlaceholder icon={card.icon} name={card.name} />
        </div>
      </Card>

      {/* 标题在卡片下方，允许 2 行截断以适配长名字（如 Audiobookshelf） */}
      <span
        title={card.name}
        className="block w-[80px] text-center text-[0.8125rem] font-medium leading-tight line-clamp-2 min-h-[1.75rem]"
      >
        {card.name}
      </span>
    </a>
  );

  // 无回调时不启用 ContextMenu，直接返回卡片（保留默认右键菜单）
  if (items.length === 0) return cardContent;

  return (
    <ContextMenu items={items} menuWidth={180}>
      {cardContent}
    </ContextMenu>
  );
}

/** 图标显示：有图标 URL 显示图标，否则首字母色块 */
function IconOrPlaceholder({ icon, name }: { icon: string; name: string }) {
  // 判断是否为 URL（http/https 或 / 开头）
  const isUrl = /^(https?:\/|\/)/.test(icon);

  if (isUrl) {
    return (
      <img
        src={icon}
        alt={name}
        loading="lazy"
        decoding="async"
        className="size-14 rounded-md object-contain"
        onError={(e) => {
          // 加载失败显示首字母占位
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // 首字母色块占位
  const firstChar = name.charAt(0).toUpperCase();
  return (
    <span className="size-14 rounded-md bg-accent/10 text-accent flex items-center justify-center text-xl font-semibold">
      {firstChar}
    </span>
  );
}
