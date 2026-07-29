'use client';

import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeMode } from '@/types';

/**
 * 主题设置（Linear / Vercel 风格）
 *
 * - Card 容器 + section 标题 + 描述
 * - RadioList label-above-input，即时保存
 */
export function ThemeForm() {
  const { mode, setMode } = useTheme();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChange = async (value: string) => {
    const newMode = value as ThemeMode;
    setMode(newMode);
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'theme', value: newMode }),
      });
      if (!res.ok) {
        setMsg({ type: 'error', text: '保存失败' });
        return;
      }
      setMsg({ type: 'success', text: '已保存' });
    } catch {
      setMsg({ type: 'error', text: '网络错误' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding={5} variant="default">
      <VStack gap={5}>
        {/* Section header */}
        <VStack gap={1}>
          <Heading level={5}>主题</Heading>
          <Text size="sm" color="secondary">
            选择明亮、暗黑或跟随系统
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
      </VStack>
    </Card>
  );
}
