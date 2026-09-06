'use client';

import { HStack } from '@astryxdesign/core/HStack';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useState } from 'react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import {
  NETWORK_MODE_CHANGE_EVENT,
  NETWORK_MODE_META,
  NETWORK_MODE_ORDER,
} from '@/lib/network-mode';
import { ApiError } from '@/lib/request/ApiError';
import { preferencesApi } from '@/services';
import type { NetworkMode } from '@/types';

interface NetworkFormProps {
  /** SSR 时从 UserPreference 读取的初始值 */
  initialMode: NetworkMode;
}

/**
 * 网络模式设置
 *
 * SegmentedControl 即时保存（无底部保存栏）。
 * 通过 window 事件 'network-mode-change' 通知主页重新探测状态灯。
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
        new CustomEvent(NETWORK_MODE_CHANGE_EVENT, { detail: newMode }),
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

  // 监听右上角工具栏触发的网络模式变更，保持设置页同步
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NetworkMode>).detail;
      if (detail) setMode(detail);
    };
    window.addEventListener(NETWORK_MODE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(NETWORK_MODE_CHANGE_EVENT, handler);
  }, []);

  const meta = NETWORK_MODE_META[mode];

  return (
    <SettingsSection title="网络" description="影响卡片点击跳转使用的 URL">
      <VStack gap={2}>
        <SegmentedControl
          label="网络模式"
          value={mode}
          onChange={handleChange}
          layout="fill"
          isDisabled={saving}
        >
          {NETWORK_MODE_ORDER.map((m) => {
            const item = NETWORK_MODE_META[m];
            return (
              <SegmentedControlItem
                key={m}
                value={m}
                label={item.label}
                icon={<item.Icon size={16} />}
              />
            );
          })}
        </SegmentedControl>
        <Text size="2xs" color="secondary">
          {meta.description}
        </Text>
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
