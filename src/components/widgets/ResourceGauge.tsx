import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { DotMeter } from '@/components/widgets/DotMeter';
import type { DockerResourceSummary, WidgetSize } from '@/types';

interface ResourceGaugeProps {
  resource: DockerResourceSummary;
  available: boolean;
  /** 尺寸档位：S=紧凑 / M=标准 / L=详细 */
  size?: WidgetSize;
}

/**
 * 资源水位 widget（Nothing / KWGT 点阵风格）
 *
 * 三档形态：
 * - S：标签与点阵数值同行（两级行结构在 150% 字号下必然撑破 96px 卡高）
 * - M：CPU/内存两列卡片（点阵大数字 + 点阵条）+ 磁盘读写
 * - L：M 的内容 + 读写速度更详细（带图标和单位强化）
 *
 * 视觉：KWGTDot47 点阵数字 + DotMeter 点阵条，与 NAS 状态 / 日期 widget
 * 同一套 Nothing 设计语言；超阈值时数字与条变为 warning / danger 色。
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

  const padding = 4;
  const gap = size === 'S' ? 1.5 : 3;

  if (!available) {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          <span className="widget-kicker">资源水位</span>
          <Text size="sm" color="secondary">
            Docker 不可用
          </Text>
        </VStack>
      </Card>
    );
  }

  // S 档：CPU/内存两列点阵小数字
  if (size === 'S') {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          <span className="widget-kicker">资源</span>
          <HStack gap={4} className="w-full">
            <MetricCell
              label="CPU"
              percent={cpuPercent}
              variant={cpuVariant}
              compact
            />
            <MetricCell
              label="内存"
              percent={memoryPercent}
              variant={memVariant}
              compact
            />
          </HStack>
        </VStack>
      </Card>
    );
  }

  const diskRow =
    size === 'M' ? (
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
    ) : (
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
    );

  // M / L 档：CPU/内存两列卡片 + 磁盘读写
  return (
    <Card className="widget-surface" elevation="none" padding={padding}>
      <VStack gap={gap} className="h-full justify-between">
        <span className="widget-kicker">资源水位</span>
        <HStack gap={4} className="w-full">
          <MetricCell label="CPU" percent={cpuPercent} variant={cpuVariant} />
          <MetricCell
            label="内存"
            percent={memoryPercent}
            variant={memVariant}
          />
        </HStack>
        {diskRow}
      </VStack>
    </Card>
  );
}

/** 单指标卡片列：点阵大数字 + 点阵条（Nothing CPU widget 同源） */
function MetricCell({
  label,
  percent,
  variant,
  compact = false,
}: {
  label: string;
  percent: number;
  variant: 'accent' | 'warning' | 'error';
  compact?: boolean;
}) {
  const color = variantColor(variant);

  // S 档：标签 + 数值 + 点阵条同行（基线对齐），保证 150% 字号下仍保住内边距
  if (compact) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="widget-kicker">{label}</span>
          <span
            className="resource-widget-value"
            style={{ color, fontSize: '1.5rem' }}
          >
            {percent.toFixed(0)}
          </span>
          <span className="resource-widget-unit" style={{ color }}>
            %
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <DotMeter
            percent={percent}
            color={color}
            rows={1}
            label={`${label} 使用率`}
          />
        </div>
      </div>
    );
  }

  return (
    <VStack gap={1.5} className="min-w-0 flex-1">
      <span className="widget-kicker">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex items-baseline">
          <span
            className="resource-widget-value"
            style={{
              color,
              fontSize: '2rem',
            }}
          >
            {percent.toFixed(1)}
          </span>
          <span className="resource-widget-unit" style={{ color }}>
            %
          </span>
        </div>
      </div>
      <DotMeter
        percent={percent}
        color={color}
        rows={2}
        label={`${label} 使用率`}
      />
    </VStack>
  );
}

function variantColor(variant: 'accent' | 'warning' | 'error'): string {
  return variant === 'error'
    ? 'var(--color-danger)'
    : variant === 'warning'
      ? 'var(--color-warning)'
      : 'var(--color-accent)';
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
