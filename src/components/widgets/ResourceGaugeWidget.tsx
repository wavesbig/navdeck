import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { DockerResourceSummary, WidgetSize } from '@/types';

interface ResourceGaugeProps {
  resource: DockerResourceSummary;
  available: boolean;
  /** 尺寸档位：S=紧凑 / M=标准 / L=详细 */
  size?: WidgetSize;
}

/**
 * 资源水位 widget
 *
 * 三档形态：
 * - S：CPU/内存两个迷你数字 + 迷你条（一行）
 * - M：CPU 行 + 内存行 + 磁盘读写副信息
 * - L：M 的内容 + 读写速度更详细（带图标和单位强化）
 *
 * 视觉：blue accent（资源主题），主数据字号梯度
 */
export function ResourceGauge({
  resource,
  available,
  size = 'M',
}: ResourceGaugeProps) {
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

  const padding = size === 'S' ? 2 : 4;
  const gap = size === 'S' ? 1.5 : 3;

  if (!available) {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          <Text
            size="2xs"
            color="secondary"
            weight="medium"
            className="uppercase tracking-wider"
          >
            资源水位
          </Text>
          <Text size="sm" color="secondary">
            Docker 不可用
          </Text>
        </VStack>
      </Card>
    );
  }

  // S 档：CPU/内存迷你一行
  if (size === 'S') {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          <Text
            size="2xs"
            color="secondary"
            weight="medium"
            className="uppercase tracking-wider"
          >
            资源
          </Text>
          <VStack gap={1.5}>
            <MiniRow label="CPU" value={cpuPercent} variant={cpuVariant} />
            <MiniRow label="内存" value={memoryPercent} variant={memVariant} />
          </VStack>
        </VStack>
      </Card>
    );
  }

  // M 档：CPU/内存条 + 磁盘读写
  if (size === 'M') {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          <Text
            size="2xs"
            color="secondary"
            weight="medium"
            className="uppercase tracking-wider"
          >
            资源水位
          </Text>
          <VStack gap={2}>
            <GaugeRow label="CPU" percent={cpuPercent} variant={cpuVariant} />
            <GaugeRow
              label="内存"
              percent={memoryPercent}
              variant={memVariant}
            />
          </VStack>
          <HStack gap={4} align="center" justify="between" className="pt-1">
            <DiskMetric
              label="读"
              value={`${formatBytes(diskReadBytesPerSec)}/s`}
              direction="down"
            />
            <div className="w-px h-3 bg-border" />
            <DiskMetric
              label="写"
              value={`${formatBytes(diskWriteBytesPerSec)}/s`}
              direction="up"
            />
          </HStack>
        </VStack>
      </Card>
    );
  }

  // L 档：M 的内容 + 更详细的磁盘读写（图标强化）
  return (
    <Card className="widget-surface" elevation="none" padding={padding}>
      <VStack gap={gap}>
        <Text
          size="2xs"
          color="secondary"
          weight="medium"
          className="uppercase tracking-wider"
        >
          资源水位
        </Text>
        <VStack gap={2}>
          <GaugeRow label="CPU" percent={cpuPercent} variant={cpuVariant} />
          <GaugeRow label="内存" percent={memoryPercent} variant={memVariant} />
        </VStack>
        <HStack gap={4} align="center" justify="between" className="pt-1">
          <DiskMetricDetailed
            label="磁盘读"
            value={formatBytes(diskReadBytesPerSec)}
            unit="/s"
            direction="down"
          />
          <div className="w-px h-4 bg-border" />
          <DiskMetricDetailed
            label="磁盘写"
            value={formatBytes(diskWriteBytesPerSec)}
            unit="/s"
            direction="up"
          />
        </HStack>
      </VStack>
    </Card>
  );
}

/** 迷你行（S 档用） */
function MiniRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'accent' | 'warning' | 'error';
}) {
  return (
    <HStack gap={2} align="center" justify="between">
      <Text size="2xs" color="secondary">
        {label}
      </Text>
      <HStack gap={1.5} align="center">
        <div className="w-12 h-1 rounded-full bg-secondary/20 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.min(value, 100)}%`,
              backgroundColor:
                variant === 'error'
                  ? 'var(--color-danger)'
                  : variant === 'warning'
                    ? 'var(--color-warning)'
                    : 'var(--color-accent)',
            }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums w-10 text-right">
          {value.toFixed(0)}%
        </span>
      </HStack>
    </HStack>
  );
}

/** 仪表行（M/L 档用） */
function GaugeRow({
  label,
  percent,
  variant,
}: {
  label: string;
  percent: number;
  variant: 'accent' | 'warning' | 'error';
}) {
  return (
    <VStack gap={1}>
      <HStack gap={2} align="center" justify="between">
        <Text size="sm">{label}</Text>
        <Text size="sm" weight="medium" className="tabular-nums">
          {percent.toFixed(1)}%
        </Text>
      </HStack>
      <ProgressBar
        label={`${label} 使用率`}
        value={percent}
        max={100}
        variant={variant}
        isLabelHidden
      />
    </VStack>
  );
}

/** 磁盘读写指标（M 档，简版） */
function DiskMetric({
  label,
  value,
  direction,
}: {
  label: string;
  value: string;
  direction: 'up' | 'down';
}) {
  return (
    <HStack gap={1} align="center">
      {direction === 'up' ? (
        <ArrowUp size={10} className="text-secondary" />
      ) : (
        <ArrowDown size={10} className="text-secondary" />
      )}
      <span className="text-sm font-medium tabular-nums">{value}</span>
      <Text size="2xs" color="secondary">
        {label}
      </Text>
    </HStack>
  );
}

/** 磁盘读写详细（L 档，带图标和单位分离） */
function DiskMetricDetailed({
  label,
  value,
  unit,
  direction,
}: {
  label: string;
  value: string;
  unit: string;
  direction: 'up' | 'down';
}) {
  return (
    <VStack gap={0.5}>
      <HStack gap={1} align="center">
        {direction === 'up' ? (
          <ArrowUp size={12} className="text-accent" />
        ) : (
          <ArrowDown size={12} className="text-accent" />
        )}
        <span className="text-base font-semibold tabular-nums">{value}</span>
        <Text size="2xs" color="secondary">
          {unit}
        </Text>
      </HStack>
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
