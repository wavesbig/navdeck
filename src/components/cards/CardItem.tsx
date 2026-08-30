import { Card } from '@astryxdesign/core/Card';
import { ContextMenu } from '@astryxdesign/core/ContextMenu';
import { useToast } from '@astryxdesign/core/Toast';
import { Copy, Link2Off, Pencil, Trash2 } from 'lucide-react';
import { StatusDot } from '@/components/cards/StatusDot';
import { IconImage } from '@/components/icons/IconImage';
import type { CardStatus, Card as CardType } from '@/types';

/** 卡片视觉宽度，拖拽预览与网格间距计算共用 */
export const CARD_WIDTH = 80;

interface CardItemProps {
  card: CardType;
  status?: CardStatus;
  /**
   * 点击卡片跳转的 URL（由父组件根据网络模式决定）。
   * 仅在 interactive=true（默认）时使用；interactive=false 时可不传。
   */
  href?: string;
  /** 点击卡片时触发（fire-and-forget 单卡片探测） */
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /**
   * 是否可交互（默认 true）。
   * - true：渲染 <a href> + 右键菜单 + 点击跳转
   * - false：渲染 <div>，无 href、无右键菜单、无跳转，
   *   用于排序模式与拖拽预览，避免 href="#" 之类的 dead link
   */
  interactive?: boolean;
}

/**
 * 单个服务卡片
 *
 * 视觉规范（ui-spec §4.5）：
 * - 卡片本体 80×80px（仅图标 + 右上角状态灯）
 * - 标题在卡片下方独立区域
 * - 圆角 18px（--radius-widget，与 widget 栏统一）
 * - 边框 hair + 背景 paper-1
 * - hover：上浮 -2px + 阴影
 * - 状态灯 8px 圆点在右上角
 * - 标题 13px / 字重 500，最多 2 行（line-clamp-2，长名字如 Audiobookshelf 可完整显示）
 *
 * 交互：
 * - 左键点击 → 新标签页打开 href
 * - 右键 → ContextMenu（编辑卡片 / 复制 URL / 删除卡片），遵循交互规范 §3
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
  const showToast = useToast();

  // 卡片视觉主体（由 <a> 或 <div> 包裹）
  const cardVisual = (
    <>
      <Card
        width={CARD_WIDTH}
        height={CARD_WIDTH}
        padding={0}
        className={`widget-card relative overflow-hidden transition-[translate,box-shadow] duration-200 ${interactive ? 'hover:-translate-y-0.5 hover:shadow-md' : ''} group-focus-visible:ring-2 group-focus-visible:ring-accent ${card.lucky?.missing ? 'opacity-60' : ''}`}
      >
        {/* 右上角状态灯 */}
        <span className="absolute top-1.5 right-1.5 z-10">
          <StatusDot status={status} />
        </span>

        {/* Lucky 失效标记：左上角小图标，hover 提示原因 */}
        {card.lucky?.missing && (
          <span
            className="absolute top-1.5 left-1.5 z-10 text-warning"
            title="Lucky 反代规则已删除"
          >
            <Link2Off size={12} strokeWidth={1.5} />
          </span>
        )}

        {/* 图标居中 */}
        <div className="w-full h-full flex items-center justify-center p-2.5">
          <IconImage icon={card.icon} name={card.name} />
        </div>
      </Card>

      {/* 标题在卡片下方，允许 2 行截断以适配长名字（如 Audiobookshelf） */}
      <span
        title={card.name}
        className="block w-[80px] text-center text-xs font-medium leading-tight [overflow-wrap:anywhere] line-clamp-2 min-h-[1.75rem]"
      >
        {card.name}
      </span>
    </>
  );

  // 非交互模式：渲染 <div>，用于排序模式与拖拽预览，避免 dead link
  if (!interactive) {
    return (
      <div className="group inline-flex flex-col items-center gap-1.5 w-[80px] cursor-grab active:cursor-grabbing">
        {cardVisual}
      </div>
    );
  }

  // 交互模式：渲染 <a href>，左键打开新标签页，右键 ContextMenu
  // 菜单结构遵循规范 §3：编辑项 / 资源特有操作（复制 URL）/ 删除项
  const items =
    onEdit || onDelete
      ? [
          ...(onEdit
            ? [
                {
                  label: '编辑卡片',
                  icon: <Pencil size={14} />,
                  onClick: onEdit,
                },
                { type: 'divider' as const },
              ]
            : []),
          {
            label: '复制 URL',
            icon: <Copy size={14} />,
            onClick: async () => {
              if (!href) return;
              try {
                await navigator.clipboard.writeText(href);
                showToast({ body: '已复制链接', type: 'info' });
              } catch {
                showToast({ body: '复制失败', type: 'error' });
              }
            },
          },
          ...(onDelete
            ? [
                { type: 'divider' as const },
                {
                  label: '删除卡片',
                  icon: <Trash2 size={14} />,
                  onClick: onDelete,
                },
              ]
            : []),
        ]
      : [];

  const cardContent = (
    <a
      href={href ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="group inline-flex flex-col items-center gap-1.5 w-[80px] focus:outline-none"
    >
      {cardVisual}
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
