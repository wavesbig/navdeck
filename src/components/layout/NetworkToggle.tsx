'use client';

import {useState} from 'react';
import {SegmentedControl} from '@astryxdesign/core/SegmentedControl';
import {SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import type {NetworkMode} from '@/types';

interface NetworkToggleProps {
  /** 初始网络模式（SSR 时从 UserPreference 读取） */
  initialMode: NetworkMode;
}

/**
 * 网络模式三态切换器
 *
 * - auto / internal / external
 * - 切换后立即 PATCH /api/preferences
 * - 通过 window 事件 'network-mode-change' 通知主页重新探测状态灯
 */
export function NetworkToggle({initialMode}: NetworkToggleProps) {
  const [mode, setMode] = useState<NetworkMode>(initialMode);

  const handleChange = async (value: string) => {
    const newMode = value as NetworkMode;
    setMode(newMode);

    // 后台持久化
    try {
      await fetch('/api/preferences', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({key: 'networkMode', value: newMode}),
      });
    } catch (e) {
      console.error('保存网络模式失败', e);
    }

    // 通知主页重新探测状态灯
    window.dispatchEvent(
      new CustomEvent('network-mode-change', {detail: newMode})
    );
  };

  return (
    <SegmentedControl
      value={mode}
      onChange={handleChange}
      label="网络模式"
      size="sm"
    >
      <SegmentedControlItem value="auto" label="Auto" />
      <SegmentedControlItem value="internal" label="内网" />
      <SegmentedControlItem value="external" label="外网" />
    </SegmentedControl>
  );
}
