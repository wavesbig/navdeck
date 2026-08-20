import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { DotMeter } from '@/components/widgets/DotMeter';
import type {
  DockerEngineInfo,
  DockerStatusSummary,
  WidgetSize,
} from '@/types';

interface NasStatusProps {
  status: DockerStatusSummary;
  engine: DockerEngineInfo;
  available: boolean;
  /** 尺寸档位：S=紧凑 / M=标准 / L=详细 */
  size?: WidgetSize;
}

/**
 * NAS 状态 widget（Nothing / KWGT 点阵风格）
 *
 * 三档形态：
 * - S：点阵大数字 运行/总数（一行紧凑）
 * - M：S + 运行率点阵条 + 图例（运行 / 停止）
 * - L：M + 引擎信息（镜像 / 版本 / 宿主机规格）+ 运行容器名
 *
 * 视觉：KWGTDot47 点阵数字 + NType82 字标 + DotMeter 点阵条，
 * 与日期 widget 同一套 Nothing 设计语言。
 */
export function NasStatus({
  status,
  engine,
  available,
  size = 'M',
}: NasStatusProps) {
  const { running, total, stopped, runningNames } = status;
  const isPartial = available && stopped > 0;
  const isOffline = !available || total === 0;

  const dotColor = isOffline
    ? 'var(--color-secondary)'
    : isPartial
      ? 'var(--color-warning)'
      : 'var(--color-success)';

  const stateLabel = isOffline ? '离线' : isPartial ? '部分运行' : '在线';
  const runRate = total > 0 ? Math.round((running / total) * 100) : 0;

  const padding = 4;
  const gap = size === 'S' ? 1.5 : 3;

  const header = (
    <div className="flex items-center justify-between">
      <span className="widget-kicker">NAS 状态</span>
      <HStack gap={1.5} align="center">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <Text size="2xs" color="secondary">
          {stateLabel}
        </Text>
      </HStack>
    </div>
  );

  const hero = (
    <div className="flex items-baseline gap-1.5">
      <span
        className="nas-widget-value"
        style={{ fontSize: size === 'S' ? '1.9rem' : '2.6rem' }}
      >
        {running}
      </span>
      <span className="nas-widget-hero-total">/{total}</span>
    </div>
  );

  if (isOffline) {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          {header}
          <Text size="sm" color="secondary">
            Docker 不可用
          </Text>
        </VStack>
      </Card>
    );
  }

  // S 档：字标 + 大数字与迷你运行率条同行（紧凑无空洞）
  if (size === 'S') {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={2} className="h-full justify-center">
          {header}
          <HStack gap={3} align="center">
            {hero}
            <VStack gap={1} className="min-w-0 flex-1">
              <DotMeter
                percent={runRate}
                color="var(--color-success)"
                rows={1}
                label={`运行率 ${runRate}%`}
              />
              <span className="nas-widget-legend">
                运行 {running} · 停止 {stopped}
              </span>
            </VStack>
          </HStack>
        </VStack>
      </Card>
    );
  }

  const legend = (
    <HStack gap={4} align="center">
      <LegendItem color="var(--color-success)" label="运行" value={running} />
      <LegendItem
        color={stopped > 0 ? 'var(--color-danger)' : 'var(--color-border)'}
        label="停止"
        value={stopped}
      />
      <span className="nas-widget-legend" style={{ marginLeft: 'auto' }}>
        {runRate}%
      </span>
    </HStack>
  );

  // M 档：+ 运行率点阵条 + 图例
  if (size === 'M') {
    return (
      <Card className="widget-surface" elevation="none" padding={padding}>
        <VStack gap={gap} className="h-full justify-between">
          {header}
          {hero}
          <VStack gap={2}>
            <DotMeter
              percent={runRate}
              color="var(--color-success)"
              label={`运行率 ${runRate}%`}
            />
            {legend}
          </VStack>
        </VStack>
      </Card>
    );
  }

  // L 档：M + 引擎信息 + 运行容器名
  const memGB = Math.round(engine.memTotalBytes / 1024 ** 3);
  const engineLine = [
    engine.images > 0 ? `镜像 ${engine.images}` : null,
    engine.serverVersion ? `v${engine.serverVersion}` : null,
    engine.cpus > 0 ? `${engine.cpus}C ${memGB}G` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className="widget-surface" elevation="none" padding={padding}>
      <VStack gap={gap} className="h-full justify-between">
        {header}
        {hero}
        <VStack gap={2}>
          <DotMeter
            percent={runRate}
            color="var(--color-success)"
            label={`运行率 ${runRate}%`}
          />
          {legend}
        </VStack>
        <VStack gap={1}>
          {engineLine && <span className="nas-widget-foot">{engineLine}</span>}
          {runningNames.length > 0 && (
            <span className="nas-widget-containers">
              {runningNames.join(' · ')}
            </span>
          )}
        </VStack>
      </VStack>
    </Card>
  );
}

/** Nothing 风格图例：色点 + 标签 + 数值 */
function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <HStack gap={1.5} align="center">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="nas-widget-legend">
        {label} {value}
      </span>
    </HStack>
  );
}
