'use client';

import { IconButton } from '@astryxdesign/core/IconButton';
import { Globe, Server, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { preferencesApi } from '@/services';
import type { NetworkMode } from '@/types';

interface NetworkToggleProps {
  /** 初始网络模式（SSR 时从 UserPreference 读取） */
  initialMode: NetworkMode;
}

const MODE_META: Record<NetworkMode, { label: string; icon: React.ReactNode }> =
  {
    auto: { label: 'Auto', icon: <Wand2 size={16} /> },
    internal: { label: '内网', icon: <Server size={16} /> },
    external: { label: '外网', icon: <Globe size={16} /> },
  };

const ORDER: NetworkMode[] = ['auto', 'internal', 'external'];

/**
 * 网络模式循环切换按钮
 *
 * - auto / internal / external
 * - 单个图标按钮，点击循环切换，不展开任何浮层
 * - 切换后立即 PATCH /api/preferences
 * - 通过 window 事件 'network-mode-change' 通知主页重新探测状态灯
 */
export function NetworkToggle({ initialMode }: NetworkToggleProps) {
  const [mode, setMode] = useState<NetworkMode>(initialMode);

  const handleToggle = async () => {
    const idx = ORDER.indexOf(mode);
    const newMode = ORDER[(idx + 1) % ORDER.length];
    setMode(newMode);

    // 后台持久化
    try {
      await preferencesApi.update('networkMode', newMode);
    } catch (e) {
      console.error('保存网络模式失败', e);
    }

    // 通知主页重新探测状态灯
    window.dispatchEvent(
      new CustomEvent('network-mode-change', { detail: newMode }),
    );
  };

  const current = MODE_META[mode];

  return (
    <IconButton
      label={`网络模式：${current.label}`}
      icon={current.icon}
      variant="ghost"
      tooltip={`网络模式：${current.label}（点击切换）`}
      onClick={handleToggle}
    />
  );
}
