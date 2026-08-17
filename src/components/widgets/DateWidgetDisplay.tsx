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
  /** 临近状态标签（如「3天内」） */
  urgencyLabel?: string;
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

function getHeroMetricClass(size: WidgetSize, valueLabel: string) {
  const compactValue = valueLabel.length >= 4;
  const containerSize = compactValue
    ? '@md:text-5xl @lg:text-6xl'
    : '@md:text-6xl @lg:text-7xl';
  return `${getHeroValueSize(size)} ${containerSize}`;
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
        size={size}
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
    const details = [item.anniversaryLabel, item.breakdownLabel].filter(
      (label): label is string => Boolean(label),
    );
    return (
      <div className="date-widget-hero flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-2 @sm:flex-row @sm:items-center @sm:justify-between @sm:gap-10">
          <div className="date-widget-reference min-w-0">
            <span className="date-widget-reference-kicker">
              <span className="min-w-0 truncate">
                {item.urgencyLabel
                  ? eyebrow
                  : `${eyebrow} · ${item.badgeLabel}`}
              </span>
              {item.urgencyLabel && (
                <span className={`date-widget-urgency ${tone.metricText}`}>
                  {item.urgencyLabel}
                </span>
              )}
            </span>
            <div className="date-widget-reference-metric">
              <span
                className={`date-widget-value ${getHeroMetricClass(
                  size,
                  item.valueLabel,
                )} ${tone.metricText}`}
              >
                {item.valueLabel}
              </span>
              {item.unitLabel && (
                <span className="date-widget-reference-unit">
                  {item.unitLabel}
                </span>
              )}
            </div>
            <span className="date-widget-narrow-date @sm:hidden">
              {dateLine}
            </span>
            <span className="date-widget-reference-line date-widget-title line-clamp-1 @sm:line-clamp-2">
              {item.name}
            </span>
          </div>
          <div className="hidden w-full min-w-0 flex-col items-start gap-1 text-left @sm:flex @sm:w-auto @sm:items-end @sm:text-right @sm:gap-2">
            <span className="date-widget-reference-line date-widget-meta-line">
              {dateLine}
            </span>
            {(!isLarge || !item.anniversaryLabel) &&
              item.progress !== undefined && (
                <span className="date-widget-reference-footer">
                  已过 {Math.round(item.progress * 100)}%
                </span>
              )}
          </div>
        </div>
        {isLarge && details.length > 0 && (
          <div className="hidden flex-col gap-1 @sm:flex">
            {details.map((label) => (
              <span key={label} className="date-widget-detail-line">
                {label}
              </span>
            ))}
          </div>
        )}
        {showProgress && (
          <DateWidgetProgress
            item={item}
            large={isLarge}
            className="mt-3 hidden @sm:block"
          />
        )}
      </div>
    );
  }

  return (
    <div className="date-widget-hero min-h-0">
      <DateWidgetReferenceBlock
        compact={compact}
        topLabel={
          item.urgencyLabel ? eyebrow : `${eyebrow} · ${item.badgeLabel}`
        }
        urgencyLabel={item.urgencyLabel}
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
  size,
  onClick,
}: {
  title: string;
  hint: string;
  size: WidgetSize;
  onClick?: () => void;
}) {
  // S 档（1x2 格）空间紧张：图标 + 标题横排一行，省略提示文案
  const compact = size === 'S';
  const content = (
    <>
      <span
        className={`date-widget-empty-icon${onClick ? ' is-actionable' : ''}`}
      >
        {onClick ? (
          <Plus size={compact ? 13 : 17} />
        ) : (
          <Settings size={compact ? 13 : 17} />
        )}
      </span>
      <VStack gap={1} className="items-center">
        <Text size="sm" weight="medium" className="date-widget-title">
          {title}
        </Text>
        {!compact && (
          <Text size="2xs" color="secondary" className="date-widget-copy">
            {hint}
          </Text>
        )}
      </VStack>
    </>
  );

  const className = compact
    ? 'date-widget-empty date-widget-empty-compact flex-1'
    : 'date-widget-empty flex-1';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} cursor-pointer`}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
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
  urgencyLabel,
}: {
  compact?: boolean;
  topLabel: string;
  value: string;
  unit?: string;
  lineOne: string;
  lineTwo?: string;
  metricClass: string;
  footer?: string;
  urgencyLabel?: string;
}) {
  return (
    <div
      className={`date-widget-reference ${
        compact ? 'date-widget-reference-compact' : ''
      }`}
    >
      <span className="date-widget-reference-kicker">
        <span className="min-w-0 truncate">{topLabel}</span>
        {urgencyLabel && (
          <span className={`date-widget-urgency ${metricClass}`}>
            {urgencyLabel}
          </span>
        )}
      </span>

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
