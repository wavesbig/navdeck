'use client';

import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useWidgetInstances } from '@/hooks/useWidgetConfig';
import type { WidgetBarWidth } from '@/types';

/** 栏宽度可选档位 */
const BAR_WIDTHS: WidgetBarWidth[] = [280, 320, 360, 400, 440, 480];

/**
 * Widget 栏配置浮层内容
 *
 * 栏宽度为 6 档离散值，用 SegmentedControl（fill 布局）等宽平铺，
 * 点选即生效。eyebrow 标题与 widget 内部「倒数日」等保持一致视觉语言。
 */
export function WidgetConfigPanel() {
  const { barWidth, setBarWidth } = useWidgetInstances();

  return (
    <VStack gap={2}>
      <Text
        size="2xs"
        color="secondary"
        weight="medium"
        className="uppercase tracking-wider"
      >
        栏宽度
      </Text>
      <SegmentedControl
        label="栏宽度"
        value={String(barWidth)}
        onChange={(v: string) => setBarWidth(Number(v) as WidgetBarWidth)}
        layout="fill"
        size="sm"
      >
        {BAR_WIDTHS.map((w) => (
          <SegmentedControlItem key={w} value={String(w)} label={String(w)} />
        ))}
      </SegmentedControl>
    </VStack>
  );
}
