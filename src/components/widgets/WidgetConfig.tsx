'use client';

import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Slider } from '@astryxdesign/core/Slider';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useWidgetInstances } from '@/hooks/useWidgetConfig';
import type { WidgetBarWidth } from '@/types';

/** 栏宽度档位（Slider marks） */
const BAR_WIDTH_MARKS = [
  { value: 280, label: '280' },
  { value: 320, label: '320' },
  { value: 360, label: '360' },
  { value: 400, label: '400' },
  { value: 440, label: '440' },
  { value: 480, label: '480' },
];

/**
 * Widget 栏配置浮层内容
 *
 * 仅保留栏宽度配置（双栏固定）。
 * 实例的添加/删除/排序/尺寸调整直接在 WIDGETS 区域操作：
 * - hover 栏 → 显示「编辑」+「+」按钮
 * - 点「编辑」→ 进入编辑态，每个 widget 出现排序/缩放/删除控件
 * - 点「+」→ 弹出 widget 库，选一个类型添加
 */
export function WidgetConfigPanel() {
  const { barWidth, setBarWidth } = useWidgetInstances();

  return (
    <Card className="p-4 w-[360px]">
      <VStack gap={3}>
        <Heading level={5}>Widget 栏配置</Heading>

        {/* 栏宽度 Slider */}
        <VStack gap={1}>
          <Text size="2xs" color="secondary">
            栏宽度
          </Text>
          <Slider
            label="栏宽度"
            value={barWidth}
            min={280}
            max={480}
            step={40}
            marks={BAR_WIDTH_MARKS}
            onChange={(v: number) => void setBarWidth(v as WidgetBarWidth)}
            formatValue={(v) => `${v}px`}
            valueDisplay="text"
            isLabelHidden
          />
        </VStack>

        <Text size="2xs" color="secondary">
          添加/删除/排序/尺寸：在 WIDGETS 区域直接操作
        </Text>
      </VStack>
    </Card>
  );
}
