import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { ReactNode } from 'react';
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

interface NasStatusState {
  running: number;
  total: number;
  stopped: number;
  isOffline: boolean;
  dotColor: string;
  stateLabel: string;
  runRate: number;
}

/** 派生展示状态（纯数据计算，无渲染分支） */
function deriveNasStatusState(
  status: DockerStatusSummary,
  available: boolean,
): NasStatusState {
  const { running, total, stopped } = status;
  const isOffline = !available || total === 0;
  const isPartial = available && stopped > 0;
  return {
    running,
    total,
    stopped,
    isOffline,
    dotColor: isOffline
      ? 'var(--color-secondary)'
      : isPartial
        ? 'var(--color-warning)'
        : 'var(--color-success)',
    stateLabel: isOffline ? '离线' : isPartial ? '部分运行' : '在线',
    runRate: total > 0 ? Math.round((running / total) * 100) : 0,
  };
}

/** Nothing 风格眉标：字标 + 状态点 */
function NasStatusHeader({
  dotColor,
  stateLabel,
}: {
  dotColor: string;
  stateLabel: string;
}) {
  return (
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
}

/** 点阵大数字：S 档 1.9rem，M/L 档 2.6rem */
function NasStatusHero({
  running,
  total,
  compact,
}: {
  running: number;
  total: number;
  compact: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="nas-widget-value"
        style={{ fontSize: compact ? '1.9rem' : '2.6rem' }}
      >
        {running}
      </span>
      <span className="nas-widget-hero-total">/{total}</span>
    </div>
  );
}

/** Nothing 风格图例：色点 + 标签 + 数值 + 运行率 */
function NasStatusLegend({
  running,
  stopped,
  runRate,
}: {
  running: number;
  stopped: number;
  runRate: number;
}) {
  return (
    <HStack gap={4} align="center">
      <HStack gap={1.5} align="center">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: 'var(--color-success)' }}
        />
        <span className="nas-widget-legend">运行 {running}</span>
      </HStack>
      <HStack gap={1.5} align="center">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{
            backgroundColor:
              stopped > 0 ? 'var(--color-error)' : 'var(--color-border)',
          }}
        />
        <span className="nas-widget-legend">停止 {stopped}</span>
      </HStack>
      <span className="nas-widget-legend" style={{ marginLeft: 'auto' }}>
        {runRate}%
      </span>
    </HStack>
  );
}

function NasStatusOffline({ header }: { header: ReactNode }) {
  return (
    <Card className="widget-surface" elevation="none" padding={4}>
      <VStack gap={3} className="h-full justify-between">
        {header}
        <Text size="sm" color="secondary">
          Docker 不可用
        </Text>
      </VStack>
    </Card>
  );
}

/** S 档：字标 + 大数字与迷你运行率条同行（紧凑无空洞） */
function NasStatusCompact({
  header,
  running,
  total,
  stopped,
  runRate,
}: {
  header: ReactNode;
  running: number;
  total: number;
  stopped: number;
  runRate: number;
}) {
  return (
    <Card className="widget-surface" elevation="none" padding={4}>
      <VStack gap={2} className="h-full justify-between">
        {header}
        <HStack gap={3} align="center">
          <NasStatusHero running={running} total={total} compact />
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

/** M/L 共享主体：运行率点阵条 + 图例 */
function NasStatusMeter({
  running,
  stopped,
  runRate,
}: {
  running: number;
  stopped: number;
  runRate: number;
}) {
  return (
    <VStack gap={2}>
      <DotMeter
        percent={runRate}
        color="var(--color-success)"
        label={`运行率 ${runRate}%`}
      />
      <NasStatusLegend running={running} stopped={stopped} runRate={runRate} />
    </VStack>
  );
}

/** M 档：S + 运行率点阵条 + 图例（运行 / 停止） */
function NasStatusStandard({
  header,
  running,
  total,
  stopped,
  runRate,
}: {
  header: ReactNode;
  running: number;
  total: number;
  stopped: number;
  runRate: number;
}) {
  return (
    <Card className="widget-surface" elevation="none" padding={4}>
      <VStack gap={3} className="h-full justify-between">
        {header}
        <NasStatusHero running={running} total={total} compact={false} />
        <NasStatusMeter running={running} stopped={stopped} runRate={runRate} />
      </VStack>
    </Card>
  );
}

/** L 档：M + 引擎信息（镜像 / 版本 / 宿主机规格）+ 运行容器名 */
function NasStatusDetailed({
  header,
  status,
  engine,
  running,
  total,
  stopped,
  runRate,
}: {
  header: ReactNode;
  status: DockerStatusSummary;
  engine: DockerEngineInfo;
  running: number;
  total: number;
  stopped: number;
  runRate: number;
}) {
  const memGB = Math.round(engine.memTotalBytes / 1024 ** 3);
  const engineLine = [
    engine.images > 0 ? `镜像 ${engine.images}` : null,
    engine.serverVersion ? `v${engine.serverVersion}` : null,
    engine.cpus > 0 ? `${engine.cpus}C ${memGB}G` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className="widget-surface" elevation="none" padding={4}>
      <VStack gap={3} className="h-full justify-between">
        {header}
        <NasStatusHero running={running} total={total} compact={false} />
        <NasStatusMeter running={running} stopped={stopped} runRate={runRate} />
        <VStack gap={1}>
          {engineLine && <span className="nas-widget-foot">{engineLine}</span>}
          {status.runningNames.length > 0 && (
            <span className="nas-widget-containers">
              {status.runningNames.join(' · ')}
            </span>
          )}
        </VStack>
      </VStack>
    </Card>
  );
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
  const state = deriveNasStatusState(status, available);
  const header = (
    <NasStatusHeader dotColor={state.dotColor} stateLabel={state.stateLabel} />
  );

  if (state.isOffline) {
    return <NasStatusOffline header={header} />;
  }
  if (size === 'S') {
    return (
      <NasStatusCompact
        header={header}
        running={state.running}
        total={state.total}
        stopped={state.stopped}
        runRate={state.runRate}
      />
    );
  }
  if (size === 'M') {
    return (
      <NasStatusStandard
        header={header}
        running={state.running}
        total={state.total}
        stopped={state.stopped}
        runRate={state.runRate}
      />
    );
  }
  return (
    <NasStatusDetailed
      header={header}
      status={status}
      engine={engine}
      running={state.running}
      total={state.total}
      stopped={state.stopped}
      runRate={state.runRate}
    />
  );
}
