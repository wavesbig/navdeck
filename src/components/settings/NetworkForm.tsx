'use client';

import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import type { NetworkMode } from '@/types';

interface NetworkFormProps {
  /** SSR 时从 UserPreference 读取的初始值 */
  initialMode: NetworkMode;
}

/**
 * 网络模式默认值表单
 *
 * - 三档 radio：auto / internal / external
 * - 切换后立即 PATCH /api/preferences 持久化
 * - 通过 window 事件 'network-mode-change' 通知主页重新探测状态灯
 */
export function NetworkForm({ initialMode }: NetworkFormProps) {
  const [mode, setMode] = useState<NetworkMode>(initialMode);
  const [originalMode, setOriginalMode] = useState<NetworkMode>(initialMode);
  const [msg, setMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChange = async (value: string) => {
    const newMode = value as NetworkMode;
    setMode(newMode);
    setMsg(null);

    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'networkMode', value: newMode }),
      });
      if (!res.ok) {
        setMsg({ type: 'error', text: '保存失败' });
        return;
      }
      setOriginalMode(newMode);
      setMsg({ type: 'success', text: '已保存' });

      // 通知主页重新探测状态灯
      window.dispatchEvent(
        new CustomEvent('network-mode-change', { detail: newMode }),
      );
    } catch {
      setMsg({ type: 'error', text: '网络错误' });
    }
  };

  return (
    <Card padding={4}>
      <VStack gap={3}>
        <Heading level={5}>网络模式</Heading>
        <Text size="sm" color="secondary">
          设置默认的内外网访问模式，影响卡片点击跳转时使用的 URL
        </Text>

        <RadioList
          label="网络模式"
          value={mode}
          onChange={handleChange}
          isLabelHidden
        >
          <RadioListItem
            value="auto"
            label="自动"
            description="根据当前网络环境自动选择内网或外网 URL"
          />
          <RadioListItem
            value="internal"
            label="内网"
            description="始终使用内网 URL（家庭/办公局域网环境）"
          />
          <RadioListItem
            value="external"
            label="外网"
            description="始终使用外网 URL（公网域名或 DDNS）"
          />
        </RadioList>

        <HStack gap={2} align="center">
          {mode !== originalMode && (
            <Text size="sm" color="secondary">
              保存中…
            </Text>
          )}
          {msg && (
            <Text
              size="sm"
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
