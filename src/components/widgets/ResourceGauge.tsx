import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { DockerResourceSummary } from '@/types';

interface ResourceGaugeProps {
  resource: DockerResourceSummary;
  available: boolean;
}

/**
 * 资源水位 widget
 */
export function ResourceGauge({ resource, available }: ResourceGaugeProps) {
  const {
    cpuPercent,
    memoryPercent,
    diskReadBytesPerSec,
    diskWriteBytesPerSec,
  } = resource;

  const cpuVariant =
    cpuPercent > 80 ? 'error' : cpuPercent > 60 ? 'warning' : 'accent';
  const memVariant =
    memoryPercent > 80 ? 'error' : memoryPercent > 60 ? 'warning' : 'accent';

  return (
    <Card>
      <VStack gap={3}>
        <Heading level={5}>资源水位</Heading>

        {!available ? (
          <Text size="sm" color="secondary">
            Docker 不可用
          </Text>
        ) : (
          <>
            <VStack gap={1}>
              <div className="flex gap-2 items-baseline justify-between">
                <Text size="sm">CPU</Text>
                <Text size="sm" weight="medium" className="tabular-nums">
                  {cpuPercent.toFixed(1)}%
                </Text>
              </div>
              <ProgressBar
                label="CPU 使用率"
                value={cpuPercent}
                max={100}
                variant={cpuVariant}
                isLabelHidden
              />
            </VStack>

            <VStack gap={1}>
              <div className="flex gap-2 items-baseline justify-between">
                <Text size="sm">内存</Text>
                <Text size="sm" weight="medium" className="tabular-nums">
                  {memoryPercent.toFixed(1)}%
                </Text>
              </div>
              <ProgressBar
                label="内存使用率"
                value={memoryPercent}
                max={100}
                variant={memVariant}
                isLabelHidden
              />
            </VStack>

            <div className="flex gap-4 items-end justify-between pt-1">
              <Metric
                label="磁盘读"
                value={`${formatBytes(diskReadBytesPerSec)}/s`}
              />
              <Metric
                label="磁盘写"
                value={`${formatBytes(diskWriteBytesPerSec)}/s`}
              />
            </div>
          </>
        )}
      </VStack>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <VStack gap={0}>
      <span className="text-sm font-medium tabular-nums">{value}</span>
      <Text size="2xs" color="secondary">
        {label}
      </Text>
    </VStack>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
