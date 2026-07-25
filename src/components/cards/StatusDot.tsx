interface StatusDotProps {
  status: 'online' | 'offline' | 'unknown';
  size?: number;
}

/**
 * 状态灯（三态）
 *
 * 视觉规范（ui-spec §4.5）：
 * - 8px 圆点
 * - online：绿 (--color-success / bg-success)
 * - offline：红 (--color-danger / bg-danger)
 * - unknown：灰 (bg-secondary)
 *
 * M1.6 接入真实状态检测后由父组件传入 status
 */
export function StatusDot({status, size = 8}: StatusDotProps) {
  const colorClass =
    status === 'online'
      ? 'bg-success'
      : status === 'offline'
        ? 'bg-danger'
        : 'bg-secondary';

  const tooltip =
    status === 'online' ? '在线' : status === 'offline' ? '离线' : '未知';

  return (
    <span
      className={`inline-block rounded-full ${colorClass}`}
      style={{width: size, height: size}}
      title={tooltip}
      aria-label={tooltip}
    />
  );
}
