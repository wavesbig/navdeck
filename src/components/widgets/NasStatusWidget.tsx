import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { DockerStatusSummary } from '@/types';

interface NasStatusProps {
  status: DockerStatusSummary;
  available: boolean;
}

/**
 * NAS 状态 widget
 */
export function NasStatus({ status, available }: NasStatusProps) {
  const { running, total, stopped } = status;
  const isPartial = available && stopped > 0;
  const isOffline = !available || total === 0;

  const dotColor = isOffline
    ? 'bg-secondary'
    : isPartial
      ? 'bg-warning'
      : 'bg-success';

  const stateLabel = isOffline ? '离线' : isPartial ? '部分运行' : '在线';

  return (
    <Card>
      <VStack gap={2}>
        <Heading level={5}>NAS 状态</Heading>

        <HStack gap={2} align="center">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`}
          />
          <Text size="sm" weight="medium">
            {stateLabel}
          </Text>
        </HStack>

        {available ? (
          <div className="flex gap-4 items-end">
            <Metric label="运行中" value={running} tone="success" />
            <Metric
              label="停止"
              value={stopped}
              tone={stopped > 0 ? 'danger' : 'secondary'}
            />
            <Metric label="总数" value={total} tone="secondary" />
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

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'secondary';
}) {
  const colorClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : 'text-secondary';
  return (
    <VStack gap={0}>
      <span className={`text-xl font-semibold ${colorClass}`}>{value}</span>
      <Text size="2xs" color="secondary">
        {label}
      </Text>
    </VStack>
  );
}
