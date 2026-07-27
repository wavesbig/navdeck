'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { VStack } from '@astryxdesign/core/VStack';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CountdownWidget } from '@/components/widgets/CountdownWidget';
import { CountupWidget } from '@/components/widgets/CountupWidget';
import { NasStatus } from '@/components/widgets/NasStatus';
import { ResourceGauge } from '@/components/widgets/ResourceGauge';
import { WidgetConfig } from '@/components/widgets/WidgetConfig';
import { useDockerStats } from '@/hooks/useDockerStats';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import type { WidgetKey } from '@/types';

interface WidgetBarProps {
  /** 初始配置（SSR 时从数据库读取，避免客户端闪烁） */
  initialConfigs?: {
    widgetKey: WidgetKey;
    enabled: boolean;
    order: number;
  }[];
  initialLayout?: 1 | 2;
}

/**
 * Widget 栏容器
 *
 * - 通过监听 'widget-bar-toggle' 事件响应 FloatingToolbar 的隐藏/显示切换
 * - 可见性状态持久化到 localStorage
 */
export function WidgetBar({ initialConfigs, initialLayout }: WidgetBarProps) {
  const { configs, layout } = useWidgetConfig();
  const [configOpen, setConfigOpen] = useState(false);
  // 用 lazy initializer 在客户端首次渲染就读取 localStorage，避免 effect 中 setState
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('widget-bar-visible');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  // 监听 FloatingToolbar 触发的 widget 栏切换事件
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      const next = typeof detail === 'boolean' ? detail : !isVisible;
      setIsVisible(next);
      try {
        localStorage.setItem('widget-bar-visible', String(next));
      } catch {
        // 忽略 localStorage 写入失败
      }
    };
    window.addEventListener('widget-bar-toggle', handler);
    return () => window.removeEventListener('widget-bar-toggle', handler);
  }, [isVisible]);

  // Docker 数据 hook（30s 自动刷新）
  const dockerStats = useDockerStats();

  // SSR 配置优先，避免首次渲染闪烁
  const effectiveConfigs =
    configs.length > 0
      ? configs
      : (initialConfigs ?? []).map((c) => ({
          widgetKey: c.widgetKey,
          enabled: c.enabled,
          order: c.order,
        }));

  const effectiveLayout = layout ?? initialLayout ?? 1;

  // 按排序后顺序渲染启用的 widget
  const visibleWidgets = [...effectiveConfigs]
    .filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order)
    .map((c) => c.widgetKey);

  const renderWidget = (key: WidgetKey) => {
    switch (key) {
      case 'nas-status':
        return (
          <NasStatus
            status={dockerStats.status}
            available={dockerStats.available}
          />
        );
      case 'resource-gauge':
        return (
          <ResourceGauge
            resource={dockerStats.resource}
            available={dockerStats.available}
          />
        );
      case 'countdown':
        return <CountdownWidget />;
      case 'countup':
        return <CountupWidget />;
    }
  };

  if (!isVisible) {
    // 隐藏 widget 栏：仅保留一个齿轮按钮（用于重新打开配置）
    return (
      <HStack gap={2} align="center" className="justify-end">
        <Popover
          isOpen={configOpen}
          onOpenChange={setConfigOpen}
          placement="below"
          alignment="end"
          width={320}
          label="配置 widget 栏"
          content={<WidgetConfig />}
        >
          <IconButton
            label="配置 widget 栏"
            icon={<Settings size={16} />}
            variant="ghost"
            tooltip="配置 widget 栏"
          />
        </Popover>
      </HStack>
    );
  }

  return (
    <VStack gap={3}>
      <HStack gap={2} align="center" className="justify-end">
        <Popover
          isOpen={configOpen}
          onOpenChange={setConfigOpen}
          placement="below"
          alignment="end"
          width={320}
          label="配置 widget 栏"
          content={<WidgetConfig />}
        >
          <IconButton
            label="配置 widget 栏"
            icon={<Settings size={16} />}
            variant="ghost"
            tooltip="配置 widget 栏"
          />
        </Popover>
      </HStack>

      {effectiveLayout === 2 && visibleWidgets.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {visibleWidgets.map((key) => (
            <div key={key}>{renderWidget(key)}</div>
          ))}
        </div>
      ) : (
        <VStack gap={3}>
          {visibleWidgets.map((key) => (
            <div key={key}>{renderWidget(key)}</div>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
