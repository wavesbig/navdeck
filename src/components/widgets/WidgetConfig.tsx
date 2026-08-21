'use client';

import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Slider } from '@astryxdesign/core/Slider';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useState } from 'react';
import { useWidgetInstances } from '@/hooks/useWidgetConfig';
import {
  WIDGET_BAR_WIDTH_MAX,
  WIDGET_BAR_WIDTH_MIN,
  WIDGET_BAR_WIDTH_STEP,
} from '@/types';

const WIDTH_MARKS = [
  { value: WIDGET_BAR_WIDTH_MIN },
  { value: 360 },
  { value: 440 },
  { value: 520 },
  { value: WIDGET_BAR_WIDTH_MAX },
];

/**
 * Widget 栏配置浮层内容
 *
 * 栏宽度从固定档位改为连续范围：Slider 快速拖动 + NumberInput 精确输入，
 * 提交仍走 useWidgetInstances().setBarWidth（乐观更新 + API 落库）。
 */
export function WidgetConfigPanel() {
  const { barWidth, setBarWidth } = useWidgetInstances();
  const [draftWidth, setDraftWidth] = useState(barWidth);

  // API 失败回滚 / 外部变更时，同步回已生效宽度
  useEffect(() => {
    setDraftWidth(barWidth);
  }, [barWidth]);

  const commitWidth = (value: number) => {
    setDraftWidth(value);
    void setBarWidth(value);
  };

  const handleSliderChange = (value: number | [number, number]) => {
    if (typeof value === 'number') {
      setDraftWidth(value);
    }
  };

  const handleSliderChangeEnd = (value: number | [number, number]) => {
    if (typeof value === 'number') {
      commitWidth(value);
    }
  };

  return (
    <VStack gap={3} width="100%">
      <Text type="label">栏宽度</Text>
      <Text type="supporting" textWrap="pretty">
        仅桌面右侧栏生效；窄屏堆叠到底部后自动铺满，宽度由容器决定。
      </Text>
      <HStack gap={4} width="100%" align="center">
        <StackItem size="fill">
          <Slider
            label="栏宽度"
            isLabelHidden
            value={draftWidth}
            onChange={handleSliderChange}
            onChangeEnd={handleSliderChangeEnd}
            min={WIDGET_BAR_WIDTH_MIN}
            max={WIDGET_BAR_WIDTH_MAX}
            step={WIDGET_BAR_WIDTH_STEP}
            marks={WIDTH_MARKS}
            formatValue={(value) => `${String(value)}px`}
            valueDisplay="none"
            width="100%"
          />
        </StackItem>
        <StackItem size="static">
          <NumberInput
            label="栏宽度数值"
            isLabelHidden
            value={draftWidth}
            onChange={commitWidth}
            min={WIDGET_BAR_WIDTH_MIN}
            max={WIDGET_BAR_WIDTH_MAX}
            step={WIDGET_BAR_WIDTH_STEP}
            units="px"
            isIntegerOnly
            isWheelEnabled={false}
            size="md"
            width={112}
          />
        </StackItem>
      </HStack>
    </VStack>
  );
}
