'use client';

import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import type { WidgetKey } from '@/types';

const WIDGET_LABELS: Record<WidgetKey, string> = {
  'nas-status': 'NAS 状态',
  'resource-gauge': '资源水位',
  countdown: '倒数日',
  countup: '正数日',
};

/**
 * Widget 栏配置浮层内容
 *
 * 用于嵌入 Popover 的 content prop
 */
export function WidgetConfig() {
  const { configs, layout, toggleWidget, reorderWidgets, setLayout } =
    useWidgetConfig();

  const move = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= configs.length) return;
    const newOrder = [...configs.map((c) => c.widgetKey)];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    void reorderWidgets(newOrder);
  };

  return (
    <Card className="p-4 w-80">
      <VStack gap={3}>
        <Heading level={5}>Widget 栏配置</Heading>

        {/* 栏数切换 */}
        <VStack gap={1}>
          <Text size="2xs" color="secondary">
            栏数
          </Text>
          <SegmentedControl
            value={String(layout)}
            onChange={(v) => void setLayout(Number(v) as 1 | 2)}
            label="栏数"
            size="sm"
          >
            <SegmentedControlItem value="1" label="单栏" />
            <SegmentedControlItem value="2" label="双栏" />
          </SegmentedControl>
        </VStack>

        {/* widget 列表 */}
        <VStack gap={1}>
          {configs.map((cfg, idx) => (
            <HStack
              key={cfg.widgetKey}
              gap={2}
              align="center"
              className="justify-between py-1"
            >
              <HStack gap={2} align="center">
                <GripVertical size={14} className="text-secondary" />
                <Switch
                  label={WIDGET_LABELS[cfg.widgetKey]}
                  value={cfg.enabled}
                  onChange={(checked) =>
                    void toggleWidget(cfg.widgetKey, checked)
                  }
                />
              </HStack>

              <HStack gap={0}>
                <IconButton
                  label="上移"
                  icon={<ArrowUp size={12} />}
                  variant="ghost"
                  isDisabled={idx === 0}
                  onClick={() => move(idx, -1)}
                />
                <IconButton
                  label="下移"
                  icon={<ArrowDown size={12} />}
                  variant="ghost"
                  isDisabled={idx === configs.length - 1}
                  onClick={() => move(idx, 1)}
                />
              </HStack>
            </HStack>
          ))}
        </VStack>
      </VStack>
    </Card>
  );
}
