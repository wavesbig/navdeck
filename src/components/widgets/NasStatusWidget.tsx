import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { DockerStatusSummary, WidgetSize } from '@/types';

interface NasStatusProps {
  status: DockerStatusSummary;
  available: boolean;
  /** 尺寸档位：S=紧凑 / M=标准 / L=详细 */
  size?: WidgetSize;
}

/**
 * NAS 状态 widget
 *
 * 三档形态：
 * - S：状态点 + 大数字 5/8（一行紧凑）
 * - M：S + 副信息（停止/运行率）
 * - L：M + 运行率环形进度
 *
 * 视觉：emerald accent（健康主题），主数据字号梯度
 */
export function NasStatus({ status, available, size = 'M' }: NasStatusProps) {
  const { running, total, stopped } = status;
  const isPartial = available && stopped > 0;
  const isOffline = !available || total === 0;

  const dotColor = isOffline
    ? 'bg-secondary'
    : isPartial
      ? 'bg-warning'
      : 'bg-success';

  const stateLabel = isOffline ? '离线' : isPartial ? '部分运行' : '在线';
  const runRate = total > 0 ? Math.round((running / total) * 100) : 0;

  // 主数据字号梯度
  const valueSize =
    size === 'S' ? 'text-2xl' : size === 'M' ? 'text-3xl' : 'text-4xl';

  const padding = size === 'S' ? 3 : 4;
  const gap = size === 'S' ? 2 : 3;

  // S 档：极简一行
  if (size === 'S') {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          <div className="flex items-center justify-between">
            <Text
              size="2xs"
              color="secondary"
              weight="medium"
              className="uppercase tracking-wider"
            >
              NAS
            </Text>
            <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
          </div>
          {!isOffline ? (
            <div className="flex items-end justify-between">
              <span
                className={`font-semibold tabular-nums leading-none ${valueSize} text-emerald-500`}
              >
                {running}
                <span className="text-secondary text-base font-normal">
                  /{total}
                </span>
              </span>
              <Text size="2xs" color="secondary">
                {stateLabel}
              </Text>
            </div>
          ) : (
            <Text size="sm" color="secondary">
              Docker 不可用
            </Text>
          )}
        </VStack>
      </Card>
    );
  }

  // M 档：状态点 + 大数字 + 副信息
  if (size === 'M') {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          <div className="flex items-center justify-between">
            <Text
              size="2xs"
              color="secondary"
              weight="medium"
              className="uppercase tracking-wider"
            >
              NAS 状态
            </Text>
            <HStack gap={1.5} align="center">
              <span
                className={`inline-block w-2 h-2 rounded-full ${dotColor}`}
              />
              <Text size="2xs" color="secondary">
                {stateLabel}
              </Text>
            </HStack>
          </div>

          {available ? (
            <>
              <span
                className={`font-semibold tabular-nums leading-none ${valueSize} text-emerald-500`}
              >
                {running}
                <span className="text-secondary text-lg font-normal">
                  /{total}
                </span>
              </span>
              <HStack gap={4} align="center">
                <Metric
                  label="停止"
                  value={stopped}
                  tone={stopped > 0 ? 'danger' : 'secondary'}
                />
                <div className="w-px h-3 bg-border" />
                <Metric label="运行率" value={`${runRate}%`} tone="secondary" />
              </HStack>
            </>
          ) : (
            <Text size="sm" color="secondary">
              Docker 不可用
            </Text>
          )}
        </VStack>
      </Card>
    );
  }

  // L 档：M + 环形运行率
  return (
    <Card className="widget-surface" elevation="none" padding={padding}>
      <VStack gap={gap}>
        <div className="flex items-center justify-between">
          <Text
            size="2xs"
            color="secondary"
            weight="medium"
            className="uppercase tracking-wider"
          >
            NAS 状态
          </Text>
          <HStack gap={1.5} align="center">
            <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
            <Text size="2xs" color="secondary">
              {stateLabel}
            </Text>
          </HStack>
        </div>

        {available ? (
          <div className="flex items-center justify-between gap-4">
            <VStack gap={1}>
              <span
                className={`font-semibold tabular-nums leading-none ${valueSize} text-emerald-500`}
              >
                {running}
                <span className="text-secondary text-lg font-normal">
                  /{total}
                </span>
              </span>
              <Text size="2xs" color="secondary">
                容器
              </Text>
            </VStack>
            <RunRateRing percent={runRate} size={56} />
          </div>
        ) : (
          <Text size="sm" color="secondary">
            Docker 不可用
          </Text>
        )}
      </VStack>
    </Card>
  );
}

/** 环形运行率（SVG） */
function RunRateRing({
  percent,
  size = 56,
}: {
  percent: number;
  size?: number;
}) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="shrink-0"
      role="img"
      aria-label={`运行率 ${percent}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-secondary/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-emerald-500 transition-[stroke-dashoffset] duration-500"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-current text-xs font-semibold tabular-nums"
      >
        {percent}%
      </text>
    </svg>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'success' | 'danger' | 'secondary';
}) {
  const colorClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : 'text-secondary';
  return (
    <HStack gap={1.5} align="center">
      <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>
        {value}
      </span>
      <Text size="2xs" color="secondary">
        {label}
      </Text>
    </HStack>
  );
}
