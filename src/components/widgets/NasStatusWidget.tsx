import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { DotMeter } from '@/components/widgets/DotMeter';
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

  const padding = size === 'S' ? 2 : 4;
  const gap = size === 'S' ? 1.5 : 3;

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
                className={`font-semibold tabular-nums leading-none ${valueSize} text-success`}
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
                className={`font-semibold tabular-nums leading-none ${valueSize} text-success`}
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
              <DotMeter
                percent={runRate}
                color="var(--color-success)"
                label={`运行率 ${runRate}%`}
              />
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
          <VStack gap={2}>
            <span
              className={`font-semibold tabular-nums leading-none ${valueSize} text-success`}
            >
              {running}
              <span className="text-secondary text-lg font-normal">
                /{total}
              </span>
            </span>
            <div>
              <HStack gap={2} align="center" justify="between" className="mb-1">
                <Text size="2xs" color="secondary">
                  运行率
                </Text>
                <Text size="2xs" weight="medium" className="tabular-nums">
                  {runRate}%
                </Text>
              </HStack>
              <DotMeter
                percent={runRate}
                color="var(--color-success)"
                label={`运行率 ${runRate}%`}
              />
            </div>
          </VStack>
        ) : (
          <Text size="sm" color="secondary">
            Docker 不可用
          </Text>
        )}
      </VStack>
    </Card>
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
