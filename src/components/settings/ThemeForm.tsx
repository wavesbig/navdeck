'use client';

import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Slider } from '@astryxdesign/core/Slider';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/lib/request/ApiError';
import { preferencesApi } from '@/services';
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  type FontSizePreference,
  type ThemeMode,
} from '@/types';

/**
 * 外观设置（Linear / Vercel 风格）
 *
 * - Card 容器 + section 标题 + 描述
 * - RadioList label-above-input，即时保存
 */
interface ThemeFormProps {
  initialFontSize: FontSizePreference;
}

const FONT_SIZE_MARKS = [
  { value: FONT_SIZE_MIN },
  { value: 100 },
  { value: 125 },
  { value: FONT_SIZE_MAX },
];

export function ThemeForm({ initialFontSize }: ThemeFormProps) {
  const { mode, setMode } = useTheme();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const savedFontSizeRef = useRef(initialFontSize);
  const { mutate } = useSWRConfig();

  const savePreference = async (save: () => Promise<void>) => {
    setSaving(true);
    setMsg(null);

    try {
      await save();
      setMsg({ type: 'success', text: '已保存' });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.isNetworkError) {
        setMsg({ type: 'error', text: '网络错误' });
      } else {
        setMsg({ type: 'error', text: '保存失败' });
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (value: string) => {
    const newMode = value as ThemeMode;
    setMode(newMode);
    void savePreference(() => preferencesApi.update('theme', newMode));
  };

  const applyFontSize = (value: number) => {
    setFontSize(value);
    document.documentElement.style.fontSize = `${value}%`;
  };

  const handleFontSizePreview = (value: number | [number, number]) => {
    if (typeof value === 'number') applyFontSize(value);
  };

  const handleFontSizeCommit = async (value: number) => {
    const previousSize = savedFontSizeRef.current;
    if (value === previousSize) {
      applyFontSize(value);
      return;
    }

    savedFontSizeRef.current = value;
    applyFontSize(value);
    const isSaved = await savePreference(async () => {
      await preferencesApi.update('fontSize', value);
      await mutate(preferencesApi.getKey);
    });

    if (!isSaved) {
      savedFontSizeRef.current = previousSize;
      applyFontSize(previousSize);
    }
  };

  return (
    <Card padding={5} variant="default">
      <VStack gap={5}>
        {/* Section header */}
        <VStack gap={1}>
          <Heading level={5}>外观</Heading>
          <Text size="sm" color="secondary">
            选择主题模式与界面字体大小
          </Text>
        </VStack>

        <Divider />

        {/* 主题模式 */}
        <VStack gap={2}>
          <Text size="sm" weight="medium">
            外观模式
          </Text>
          <RadioList
            label="主题模式"
            value={mode}
            onChange={handleChange}
            isLabelHidden
          >
            <RadioListItem value="light" label="明亮" />
            <RadioListItem value="dark" label="暗黑" />
            <RadioListItem value="system" label="跟随系统" />
          </RadioList>
        </VStack>

        <Divider />

        {/* 字体大小 */}
        <VStack gap={2}>
          <Text size="sm" weight="medium">
            字体大小
          </Text>
          <Text type="supporting" textWrap="pretty">
            拖动滑杆快速预览，或输入精确百分比；范围 90%–150%。
          </Text>
          <HStack gap={4} width="100%" align="center">
            <StackItem size="fill">
              <Slider
                label="字体大小"
                isLabelHidden
                value={fontSize}
                onChange={handleFontSizePreview}
                onChangeEnd={handleFontSizeCommit}
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={FONT_SIZE_STEP}
                marks={FONT_SIZE_MARKS}
                formatValue={(value) => `${value}%`}
                valueDisplay="none"
                width="100%"
              />
            </StackItem>
            <StackItem size="static">
              <NumberInput
                label="字体大小百分比"
                isLabelHidden
                value={fontSize}
                onChange={handleFontSizeCommit}
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={FONT_SIZE_STEP}
                units="%"
                isIntegerOnly
                isWheelEnabled={false}
                size="md"
                width={112}
              />
            </StackItem>
          </HStack>
        </VStack>

        <HStack gap={2} align="center">
          {saving && (
            <Text size="2xs" color="secondary">
              保存中…
            </Text>
          )}
          {msg && (
            <Text
              size="2xs"
              className={
                msg.type === 'success' ? 'text-success' : 'text-danger'
              }
            >
              {msg.text}
            </Text>
          )}
        </HStack>
      </VStack>
    </Card>
  );
}
