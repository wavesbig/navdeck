/**
 * Widget 渲染注册表
 *
 * 每种 widget 的内容渲染在此集中注册（与 src/lib/widgets/registry.ts
 * 的元数据注册表配对）。WidgetGrid 不再 switch-case 分发，
 * 加新 widget 时只需在这里加一条 render。
 */
import type { ReactNode } from 'react';
import type { WidgetKey } from '@/lib/widgets/registry';
import type { DockerStats } from '@/services/widgets';
import type { WidgetInstance, WidgetSize } from '@/types';
import { Countdown } from './Countdown';
import { Countup } from './Countup';
import { NasStatus } from './NasStatus';
import { ResourceGauge } from './ResourceGauge';

/** WidgetGrid 注入给 render 的渲染上下文 */
export interface WidgetRenderContext {
  instance: WidgetInstance;
  size: WidgetSize;
  inEditMode: boolean;
  dockerStats: DockerStats;
}

export const WIDGET_RENDERERS: Record<
  WidgetKey,
  (ctx: WidgetRenderContext) => ReactNode
> = {
  'nas-status': ({ size, dockerStats }) => (
    <NasStatus
      status={dockerStats.status}
      engine={dockerStats.engine}
      available={dockerStats.available}
      size={size}
    />
  ),
  'resource-gauge': ({ size, dockerStats }) => (
    <ResourceGauge
      resource={dockerStats.resource}
      available={dockerStats.available}
      size={size}
    />
  ),
  countdown: ({ instance, size, inEditMode }) => (
    <Countdown instanceId={instance.id} size={size} inEditMode={inEditMode} />
  ),
  countup: ({ instance, size, inEditMode }) => (
    <Countup instanceId={instance.id} size={size} inEditMode={inEditMode} />
  ),
};
