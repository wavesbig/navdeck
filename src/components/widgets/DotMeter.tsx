interface DotMeterProps {
  /** 百分比（0~100，自动截断） */
  percent: number;
  /** 填充点颜色（CSS 颜色值） */
  color: string;
  /** 点阵行数（1~3），默认 2 */
  rows?: 1 | 2 | 3;
  /** 轨道点颜色（默认主题边框色） */
  trackColor?: string;
  className?: string;
  /** 无障碍标签 */
  label?: string;
}

const dot = (color: string) =>
  `radial-gradient(circle, ${color} 1.4px, transparent 1.5px)`;
const PITCH = 7;

/**
 * 点阵仪表（Nothing 风格，与日期 widget 的 KWGTDot47 点阵数字同源）
 *
 * 轨道为灰色点阵，填充层为彩色点阵从左侧按百分比裁剪，两层逐点对齐。
 * 用于日期 widget 流逝进度、资源水位、NAS 运行率等所有计量场景。
 */
export function DotMeter({
  percent,
  color,
  rows = 2,
  trackColor = 'var(--color-border)',
  className,
  label,
}: DotMeterProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={`relative w-full overflow-hidden ${className ?? ''}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{
        height: rows * PITCH - 3,
        backgroundImage: dot(trackColor),
        backgroundPosition: 'left top',
        backgroundRepeat: 'repeat',
        backgroundSize: `${PITCH}px ${PITCH}px`,
      }}
    >
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-500"
        style={{
          width: `${clamped}%`,
          backgroundImage: dot(color),
          backgroundPosition: 'left top',
          backgroundRepeat: 'repeat',
          backgroundSize: `${PITCH}px ${PITCH}px`,
        }}
      />
    </div>
  );
}
