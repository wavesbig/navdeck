interface StatusDotProps {
  status: 'online' | 'offline' | 'unknown';
  size?: number;
}

/**
 * 状态灯（在线 / 离线两态；「未知」不渲染，由父组件控制）
 *
 * 视觉规范（ui-spec §4.5）：
 * - 10px 圆点 + 2px surface 描边环（与卡片底色隔离，提升辨识度）
 * - online：实心绿 (--color-success / bg-success)
 * - offline：空心红环（形状 + 颜色双通道，色弱可辨；token 是 error 不是 danger）
 */
export function StatusDot({ status, size = 10 }: StatusDotProps) {
  const styleClass =
    status === 'online'
      ? 'bg-success'
      : status === 'offline'
        ? 'border-2 border-error bg-transparent'
        : 'bg-secondary';

  const tooltip = status === 'online' ? '在线 · 服务可达' : '离线 · 服务无响应';

  return (
    <span
      className={`inline-block rounded-full ring-2 ring-surface ${styleClass}`}
      style={{ width: size, height: size }}
      role="img"
      title={tooltip}
      aria-label={tooltip}
    />
  );
}
