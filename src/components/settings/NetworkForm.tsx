'use client';

import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { ApiError } from '@/lib/request/ApiError';
import { preferencesApi } from '@/services';
import type { NetworkMode } from '@/types';

interface NetworkFormProps {
  /** SSR 时从 UserPreference 读取的初始值 */
  initialMode: NetworkMode;
}

/**
 * 网络模式设置（Linear / Vercel 风格）
 *
 * - Card 容器，顶部 section 标题 + 描述
 * - RadioList label-above-input，即时保存（无底部保存栏）
 * - 通过 window 事件 'network-mode-change' 通知主页重新探测状态灯
 */
export function NetworkForm({ initialMode }: NetworkFormProps) {
  const [mode, setMode] = useState<NetworkMode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChange = async (value: string) => {
    const newMode = value as NetworkMode;
    setMode(newMode);
    setSaving(true);
    setMsg(null);

    try {
      await preferencesApi.update('networkMode', newMode);
      setMsg({ type: 'success', text: '已保存' });

      // 通知主页重新探测状态灯
      window.dispatchEvent(
        new CustomEvent('network-mode-change', { detail: newMode }),
      );
    } catch (e) {
      if (e instanceof ApiError && e.isNetworkError) {
        setMsg({ type: 'error', text: '网络错误' });
      } else {
        setMsg({ type: 'error', text: '保存失败' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding={5} variant="default">
      <VStack gap={5}>
        {/* Section header */}
        <VStack gap={1}>
          <Heading level={5}>网络</Heading>
          <Text size="sm" color="secondary">
            影响卡片点击跳转使用的 URL
          </Text>
        </VStack>

        <Divider />

        {/* 网络模式 */}
        <VStack gap={2}>
          <Text size="sm" weight="medium">
            网络模式
          </Text>
          <RadioList
            label="网络模式"
            value={mode}
            onChange={handleChange}
            isLabelHidden
          >
            <RadioListItem value="auto" label="自动（按可达性探测）" />
            <RadioListItem value="internal" label="内网（始终使用内网 URL）" />
            <RadioListItem value="external" label="外网（始终使用外网 URL）" />
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
