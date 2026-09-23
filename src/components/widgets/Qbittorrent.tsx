import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { QbittorrentStats, WidgetSize } from '@/types';

interface QbittorrentProps {
  stats: QbittorrentStats;
  /** 尺寸档位：S=紧凑 / M=标准 / L=详细 */
  size?: WidgetSize;
}

/** bytes/s → 大数字与单位拆分（<1MB/s 用 KB/s） */
function formatSpeedParts(bytesPerSec: number): {
  value: string;
  unit: string;
} {
  if (bytesPerSec >= 1024 * 1024) {
    return { value: (bytesPerSec / 1024 ** 2).toFixed(1), unit: 'MB/s' };
  }
  if (bytesPerSec >= 1024) {
    return { value: String(Math.round(bytesPerSec / 1024)), unit: 'KB/s' };
  }
  return { value: '0', unit: 'KB/s' };
}

/** bytes → { value, unit }（面向累计量，最高 TB） */
function formatDataParts(bytes: number): {
  value: string;
  unit: string;
} {
  if (bytes >= 1024 ** 4) {
    return { value: (bytes / 1024 ** 4).toFixed(2), unit: 'TB' };
  }
  if (bytes >= 1024 ** 3) {
    return { value: String(Math.round(bytes / 1024 ** 3)), unit: 'GB' };
  }
  if (bytes >= 1024 ** 2) {
    return { value: String(Math.round(bytes / 1024 ** 2)), unit: 'MB' };
  }
  return { value: String(Math.round(bytes / 1024)), unit: 'KB' };
}

/**
 * qBittorrent widget（Nothing / KWGT 点阵风格）
 *
 * 信息层级自上而下：身份与任务构成 → 实时速度 → 累计与剩余。
 * - S：下载速度速览
 * - M：双英雄速度（2.6rem 级）+ 任务构成头部
 * - L：M + 单行累计与剩余上下文
 */
export function Qbittorrent({ stats, size = 'M' }: QbittorrentProps) {
  const { available, error, summary, lifetime, freeSpace } = stats;
  const padding = 4;
  const gap = size === 'S' ? 1.5 : 3;
  const down = formatSpeedParts(summary.downloadSpeed);
  const up = formatSpeedParts(summary.uploadSpeed);
  const dlLifetime = formatDataParts(lifetime.downloaded);
  const upLifetime = formatDataParts(lifetime.uploaded);
  const free = freeSpace != null ? formatDataParts(freeSpace) : null;
  const ratio =
    lifetime.downloaded > 0
      ? (lifetime.uploaded / lifetime.downloaded).toFixed(2)
      : '—';

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="widget-kicker">qBittorrent</span>
      {available && size !== 'S' && (
        <span className="nas-widget-legend nas-widget-legend-wrap">
          做种 {summary.seeding} · 下载中 {summary.downloading} · 暂停{' '}
          {summary.paused}
        </span>
      )}
    </div>
  );

  if (!available) {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          <span className="widget-kicker">qBittorrent</span>
          <Text size="sm" color="secondary">
            {error ?? 'qBittorrent 不可用'}
          </Text>
        </VStack>
      </Card>
    );
  }

  // S 档：字标 + 下载速度大数字
  if (size === 'S') {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={2} className="h-full justify-between">
          {header}
          <div className="flex flex-wrap items-baseline gap-1.5">
            <ArrowDown
              size={16}
              className="self-center text-accent"
              aria-hidden
            />
            <span className="nas-widget-value" style={{ fontSize: '1.9rem' }}>
              {down.value}
            </span>
            <span className="nas-widget-hero-total">{down.unit}</span>
          </div>
        </VStack>
      </Card>
    );
  }

  // M / L 档：实时速度（L 追加分享率）+ 任务构成图例
  return (
    <Card className="widget-surface" elevation="none" padding={padding}>
      <VStack gap={gap} className="h-full justify-between">
        {header}
        <div className="grid grid-cols-2 gap-x-4">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            <ArrowDown
              size={14}
              className="self-center text-accent"
              aria-hidden
            />
            <span
              className="nas-widget-value"
              style={{ fontSize: size === 'L' ? '2.6rem' : '1.9rem' }}
            >
              {down.value}
            </span>
            <span className="nas-widget-hero-total">{down.unit}</span>
          </div>
          {size === 'L' && (
            <span className="nas-widget-legend nas-widget-legend-wrap">
              {dlLifetime.value} {dlLifetime.unit}
            </span>
          )}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            <ArrowUp
              size={14}
              className="self-center text-success"
              aria-hidden
            />
            <span
              className="nas-widget-value"
              style={{ fontSize: size === 'L' ? '2.6rem' : '1.9rem' }}
            >
              {up.value}
            </span>
            <span className="nas-widget-hero-total">{up.unit}</span>
          </div>
          {size === 'L' && (
            <span className="nas-widget-legend nas-widget-legend-wrap">
              {upLifetime.value} {upLifetime.unit}
            </span>
          )}
        </div>
        <span className="nas-widget-legend nas-widget-legend-wrap">
          剩余空间 {free ? `${free.value} ${free.unit}` : '—'} · 分享率 {ratio}
        </span>
      </VStack>
    </Card>
  );
}
