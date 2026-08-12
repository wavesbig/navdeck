'use client';

import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Plus, Settings } from 'lucide-react';
import { DotMeter } from '@/components/widgets/DotMeter';
import type { WidgetSize } from '@/types';

export type DateWidgetTone = 'accent' | 'success' | 'warning' | 'secondary';

export interface DateWidgetVisualItem {
  id?: string;
  name: string;
  badgeLabel: string;
  dateLabel: string;
  helperLabel: string;
  unitLabel: string;
  valueLabel: string;
  tone: DateWidgetTone;
  /** 流逝进度 0~1（M/L 档显示细进度条；倒数日=创建→目标，正数日=周年周期） */
  progress?: number;
  /** 星期几（如「星期六」，仅 L 档显示） */
  weekday?: string;
  /** 周年提示（如「距 2 周年还有 20 天」，仅正数日 L 档显示） */
  anniversaryLabel?: string;
  /** 已过时长分解（如「3 年 3 个月 1 周 2 天」，仅正数日 L 档显示） */
  breakdownLabel?: string;
  /** 紧凑短标签（如「8月28日」，S 档与名称同行显示，避免与大数字重复） */
  shortLabel?: string;
  /** 下一次发生的具体日期（如「下一次 8月15日」，循环倒数日 L 档右区替代 dateLabel） */
  nextLabel?: string;
}

export interface DateWidgetPreviewData {
  eyebrow: string;
  title: string;
  value: string;
  unit?: string;
  meta?: string;
  status?: string;
  tone: DateWidgetTone;
}

function getToneClasses(tone: DateWidgetTone) {
  switch (tone) {
    case 'warning':
      return {
        metricText: 'date-widget-value-warning',
        rail: 'date-widget-rail-warning',
      };
    case 'success':
      return {
        metricText: 'date-widget-value-accent',
        rail: 'date-widget-rail-accent',
      };
    case 'secondary':
      return {
        metricText: 'date-widget-value-muted',
        rail: 'date-widget-rail-muted',
      };
    default:
      return {
        metricText: 'date-widget-value-accent',
        rail: 'date-widget-rail-accent',
      };
  }
}

function getHeroValueSize(size: WidgetSize) {
  switch (size) {
    case 'S':
      return 'text-4xl';
    case 'M':
      return 'text-5xl';
    case 'L':
      return 'text-6xl';
    default:
      return 'text-5xl';
  }
}

export function DateWidgetDisplay({
  eyebrow,
  size,
  isLoading,
  items,
  emptyTitle,
  emptyHint,
  onEmptyClick,
}: {
  eyebrow: string;
  size: WidgetSize;
  isLoading: boolean;
  items: DateWidgetVisualItem[];
  emptyTitle: string;
  emptyHint: string;
  /** 空态点击进入添加流程（不传则纯展示） */
  onEmptyClick?: () => void;
}) {
  if (isLoading) {
    return <DateWidgetSkeleton />;
  }

  if (items.length === 0) {
    return (
      <DateWidgetEmptyState
        title={emptyTitle}
        hint={emptyHint}
        onClick={onEmptyClick}
      />
    );
  }

  const hero = items[0];
  const rows = size === 'S' ? [] : items.slice(1);

  return (
    <div className="date-widget-panel flex min-h-0 flex-1 flex-col gap-4">
      <DateWidgetHero eyebrow={eyebrow} item={hero} size={size} />

      {rows.length > 0 && (
        <div
          className={`date-widget-list ${
            size === 'L' || size === 'M'
              ? 'hover-scrollbar flex-1 min-h-0 overflow-y-auto'
              : 'flex-none'
          }`}
        >
          {rows.map((item) => (
            <DateWidgetRow key={item.id ?? item.name} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DateWidgetPreview({
  preview,
}: {
  preview: DateWidgetPreviewData;
}) {
  const tone = getToneClasses(preview.tone);

  return (
    <div className="date-widget-panel flex min-h-0 flex-1 flex-col justify-between">
      <DateWidgetReferenceBlock
        topLabel={preview.status ?? preview.eyebrow}
        value={preview.value}
        unit={preview.unit}
        lineOne={preview.meta ?? preview.eyebrow}
        lineTwo={preview.title}
        metricClass={`text-5xl ${tone.metricText}`}
      />
    </div>
  );
}

function DateWidgetHero({
  eyebrow,
  item,
  size,
}: {
  eyebrow: string;
  item: DateWidgetVisualItem;
  size: WidgetSize;
}) {
  const tone = getToneClasses(item.tone);
  const valueSize = getHeroValueSize(size);
  const compact = size === 'S';
  // L 档追加星期信息（参考 Days Matter 详情页的「目标日 + 星期」）
  const dateLine =
    size === 'L' && item.weekday
      ? `${item.nextLabel ?? item.dateLabel} · ${item.weekday}`
      : item.dateLabel;
  const showProgress = !compact && item.progress !== undefined;

  // M/L 档：左右双区布局（消灭右侧留白），点阵沉底
  // L 档右区追加星期 + 周年/时长分解；M 档右区只放日期 + 已过%
  if (size === 'L' || size === 'M') {
    const isLarge = size === 'L';
    return (
      <div className="date-widget-hero flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 items-start justify-between gap-4">
          <div className="date-widget-reference min-w-0">
            <span className="date-widget-reference-kicker">
              {eyebrow} · {item.badgeLabel}
            </span>
            <div className="date-widget-reference-metric">
              <span
                className={`date-widget-value ${valueSize} ${tone.metricText}`}
              >
                {item.valueLabel}
              </span>
              {item.unitLabel && (
                <span className="date-widget-reference-unit">
                  {item.unitLabel}
                </span>
              )}
            </div>
            <span className="date-widget-reference-line date-widget-title">
              {item.name}
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <span className="date-widget-reference-line">{dateLine}</span>
            {isLarge && item.anniversaryLabel && (
              <span className="date-widget-reference-footer">
                {item.anniversaryLabel}
              </span>
            )}
            {isLarge && item.breakdownLabel && (
              <span className="date-widget-reference-footer">
                {item.breakdownLabel}
              </span>
            )}
            {(!isLarge || !item.anniversaryLabel) &&
              item.progress !== undefined && (
                <span className="date-widget-reference-footer">
                  已过 {Math.round(item.progress * 100)}%
                </span>
              )}
          </div>
        </div>
        {showProgress && (
          <DateWidgetProgress item={item} large={isLarge} className="mt-3" />
        )}
      </div>
    );
  }

  return (
    <div className="date-widget-hero min-h-0">
      <DateWidgetReferenceBlock
        compact={compact}
        topLabel={compact ? eyebrow : `${eyebrow} · ${item.badgeLabel}`}
        value={item.valueLabel}
        unit={item.unitLabel}
        lineOne={
          compact
            ? `${item.name} · ${item.shortLabel ?? item.helperLabel}`
            : dateLine
        }
        lineTwo={compact ? undefined : item.name}
        metricClass={`${valueSize} ${tone.metricText}`}
      />
      {showProgress && <DateWidgetProgress item={item} className="mt-1" />}
    </div>
  );
}

/** 流逝进度点阵区块（M 档 2 行，L 档 3 行，跟随内容流） */
function DateWidgetProgress({
  item,
  large,
  className,
}: {
  item: DateWidgetVisualItem;
  large?: boolean;
  className?: string;
}) {
  const dotColor =
    item.tone === 'secondary'
      ? 'var(--date-widget-muted)'
      : item.tone === 'success'
        ? 'var(--color-success)'
        : item.tone === 'warning'
          ? 'var(--color-warning)'
          : '#d71921';
  return (
    <DotMeter
      percent={(item.progress ?? 0) * 100}
      color={dotColor}
      rows={large ? 3 : 2}
      trackColor="var(--date-widget-rail)"
      className={className}
      label="流逝进度"
    />
  );
}

function DateWidgetRow({ item }: { item: DateWidgetVisualItem }) {
  const tone = getToneClasses(item.tone);

  return (
    <div className="date-widget-row">
      <div className="min-w-0 flex-1">
        <span className="date-widget-row-tag">{item.badgeLabel}</span>
        <div className="date-widget-row-title">{item.name}</div>
        <div className="date-widget-row-copy">
          {item.dateLabel} · {item.helperLabel}
        </div>
      </div>

      <div className="date-widget-row-metric">
        <span className={`date-widget-row-value ${tone.metricText}`}>
          {item.valueLabel}
        </span>
        <span className="date-widget-row-unit">{item.unitLabel}</span>
        <span className={`date-widget-row-rail ${tone.rail}`} />
      </div>
    </div>
  );
}

function DateWidgetSkeleton() {
  return (
    <VStack gap={2}>
      <div>
        <VStack gap={2}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton width="28%" height={10} />
            <Skeleton width="24%" height={10} index={1} />
          </div>
          <div className="pt-2">
            <Skeleton width={96} height={44} radius={3} index={2} />
          </div>
          <div className="border-t border-border/70 pt-3">
            <VStack gap={1}>
              <Skeleton width="56%" height={12} index={3} />
              <Skeleton width="72%" height={10} index={4} />
            </VStack>
          </div>
        </VStack>
      </div>
      <div className="border-t border-border/60 pt-2.5">
        <div className="flex items-center justify-between gap-3">
          <VStack gap={1}>
            <Skeleton width="40%" height={10} index={5} />
            <Skeleton width="68%" height={10} index={6} />
          </VStack>
          <Skeleton width={42} height={24} radius={2} index={7} />
        </div>
      </div>
    </VStack>
  );
}

function DateWidgetEmptyState({
  title,
  hint,
  onClick,
}: {
  title: string;
  hint: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="date-widget-reference-kicker">未配置</span>
      {onClick ? (
        <Plus size={16} className="text-secondary/40" />
      ) : (
        <Settings size={16} className="text-secondary/40" />
      )}
      <Text size="sm" weight="medium" className="date-widget-title">
        {title}
      </Text>
      <Text size="2xs" color="secondary" className="date-widget-copy">
        {hint}
      </Text>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="date-widget-panel flex-1 cursor-pointer text-left"
      >
        <VStack gap={2} className="items-start justify-center">
          {content}
        </VStack>
      </button>
    );
  }

  return (
    <VStack
      gap={2}
      className="date-widget-panel flex-1 items-start justify-center text-left"
    >
      {content}
    </VStack>
  );
}

function DateWidgetReferenceBlock({
  compact = false,
  topLabel,
  value,
  unit,
  lineOne,
  lineTwo,
  metricClass,
  footer,
}: {
  compact?: boolean;
  topLabel: string;
  value: string;
  unit?: string;
  lineOne: string;
  lineTwo?: string;
  metricClass: string;
  footer?: string;
}) {
  return (
    <div
      className={`date-widget-reference ${
        compact ? 'date-widget-reference-compact' : ''
      }`}
    >
      <span className="date-widget-reference-kicker">{topLabel}</span>

      <div className="date-widget-reference-metric">
        <span className={`date-widget-value ${metricClass}`}>{value}</span>
        {unit && <span className="date-widget-reference-unit">{unit}</span>}
      </div>

      <span className="date-widget-reference-line">{lineOne}</span>
      {lineTwo && (
        <span className="date-widget-reference-line date-widget-title">
          {lineTwo}
        </span>
      )}

      {footer && <span className="date-widget-reference-footer">{footer}</span>}
    </div>
  );
}
