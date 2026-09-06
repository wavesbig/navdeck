'use client';

import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Slider } from '@astryxdesign/core/Slider';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { SettingsSection } from '@/components/settings/SettingsSection';
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
 * 外观设置
 *
 * - 主题模式：视觉化预览瓦片，点击即时保存
 * - 字体大小：滑杆预览 + 数字输入，提交时保存
 */
interface ThemeFormProps {
  initialFontSize: FontSizePreference;
  /** 外观卡片内的附加设置行（如可达状态开关），渲染在字体大小之后 */
  children?: React.ReactNode;
}

const FONT_SIZE_MARKS = [
  { value: FONT_SIZE_MIN },
  { value: 100 },
  { value: 125 },
  { value: FONT_SIZE_MAX },
];

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '明亮' },
  { value: 'dark', label: '暗黑' },
  { value: 'system', label: '跟随系统' },
];

export function ThemeForm({ initialFontSize, children }: ThemeFormProps) {
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

  const handleChange = (newMode: ThemeMode) => {
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
    <SettingsSection
      title="外观"
      description="选择主题模式、界面字体大小与卡片状态点显示"
    >
      <VStack gap={5}>
        {/* 主题模式：视觉化预览瓦片 */}
        <VStack gap={2}>
          <Text size="sm" weight="medium">
            外观模式
          </Text>
          <div
            role="radiogroup"
            aria-label="外观模式"
            className="grid grid-cols-3 gap-2"
          >
            {THEME_OPTIONS.map((option) => (
              <ThemeModeTile
                key={option.value}
                mode={option.value}
                label={option.label}
                isSelected={mode === option.value}
                onSelect={() => handleChange(option.value)}
              />
            ))}
          </div>
        </VStack>

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

        {children}

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
    </SettingsSection>
  );
}

interface ThemeModeTileProps {
  mode: ThemeMode;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * 主题模式预览瓦片
 *
 * 纯 CSS 迷你界面示意：顶栏 + 内容行。
 * 预览需要脱离当前主题固定表达亮/暗，故使用中性色而非语义 token。
 */
function ThemeModeTile({
  mode,
  label,
  isSelected,
  onSelect,
}: ThemeModeTileProps) {
  return (
    <label
      className={`group flex flex-col gap-1.5 rounded-panel border-2 p-1.5 text-left transition-[border-color,box-shadow] cursor-pointer ${
        isSelected
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-border hover:border-accent/50'
      }`}
    >
      <span className="flex h-14 w-full overflow-hidden rounded-control border border-border">
        {(mode === 'light' || mode === 'system') && (
          <MiniWindowScheme dark={false} />
        )}
        {(mode === 'dark' || mode === 'system') && (
          <MiniWindowScheme dark={true} />
        )}
      </span>
      <Text
        size="2xs"
        weight={isSelected ? 'medium' : 'normal'}
        className="px-0.5"
      >
        {label}
      </Text>
      <input
        type="radio"
        name="theme-mode"
        value={mode}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
        aria-label={label}
      />
    </label>
  );
}

/** 迷你窗口示意（亮/暗各半用于「跟随系统」） */
function MiniWindowScheme({ dark }: { dark: boolean }) {
  const bg = dark ? 'bg-neutral-800' : 'bg-neutral-100';
  const bar = dark ? 'bg-neutral-700' : 'bg-neutral-300';
  const line = dark ? 'bg-neutral-600' : 'bg-neutral-400';
  return (
    <span className={`flex-1 ${bg} p-1.5 flex flex-col gap-1`} aria-hidden>
      <span className={`h-1 w-1/3 rounded-full ${bar}`} />
      <span className={`h-1 w-2/3 rounded-full ${line}`} />
      <span className={`h-1 w-1/2 rounded-full ${line}`} />
    </span>
  );
}
