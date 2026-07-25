import {Card} from '@astryxdesign/core/Card';
import type {Card as CardType, CardStatus} from '@/types';
import {StatusDot} from '@/components/cards/StatusDot';

interface CardItemProps {
  card: CardType;
  status?: CardStatus;
  /** 点击卡片跳转的 URL（由父组件根据网络模式决定） */
  href: string;
  /** 点击卡片时触发（fire-and-forget 单卡片探测） */
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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
 */
export function CardItem({card, status = 'unknown', href, onClick, onEdit, onDelete}: CardItemProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="group inline-flex flex-col items-center gap-1.5 w-[80px] focus:outline-none"
    >
      <Card
        width={80}
        height={80}
        padding={0}
        className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-accent"
      >
        {/* 右上角状态灯 */}
        <span className="absolute top-1.5 right-1.5 z-10">
          <StatusDot status={status} />
        </span>

        {/* 图标居中 */}
        <div className="w-full h-full flex items-center justify-center p-2.5">
          <IconOrPlaceholder icon={card.icon} name={card.name} />
        </div>

        {/* hover 操作按钮（M1.4 占位，M1.5 接入） */}
        {(onEdit || onDelete) && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 py-1 opacity-0 group-hover:opacity-100 bg-surface/80 backdrop-blur-sm transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onEdit();
                }}
                className="text-xs text-secondary hover:text-primary"
              >
                编辑
              </button>
            )}
            {onEdit && onDelete && <span className="text-secondary">·</span>}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
                className="text-xs text-danger hover:text-danger"
              >
                删除
              </button>
            )}
          </div>
        )}
      </Card>

      {/* 标题在卡片下方，允许 2 行截断以适配长名字（如 Audiobookshelf） */}
      <span
        title={card.name}
        className="block w-[80px] text-center text-[13px] font-medium leading-tight line-clamp-2 min-h-[1.75rem]"
      >
        {card.name}
      </span>
    </a>
  );
}

/** 图标显示：有图标 URL 显示图标，否则首字母色块 */
function IconOrPlaceholder({icon, name}: {icon: string; name: string}) {
  // 判断是否为 URL（http/https 或 / 开头）
  const isUrl = /^(https?:\/|\/)/.test(icon);

  if (isUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt={name}
        className="w-14 h-14 rounded-md object-contain"
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
    <span className="w-14 h-14 rounded-md bg-accent/10 text-accent flex items-center justify-center text-xl font-semibold">
      {firstChar}
    </span>
  );
}
