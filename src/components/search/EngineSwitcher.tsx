'use client';

import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { Globe } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { preferencesApi } from '@/services';
import type { SearchEngine, SearchEngineConfig } from '@/types';

interface EngineSwitcherProps {
  /** 初始引擎 key（SSR 时从 UserPreference 读取，避免客户端闪烁） */
  initialEngine: SearchEngine;
  /** 合并引擎列表（内置 + 自定义，SSR 传入） */
  engines: SearchEngineConfig[];
  /** 引擎切换回调（SearchBox 监听用于回车跳转） */
  onChange?: (engine: SearchEngine) => void;
}

/**
 * 搜索引擎切换器
 *
 * - 内置 5 引擎 + 设置页添加的自定义引擎（合并列表由 SSR 传入）
 * - 触发按钮 icon-only：只显示当前引擎 logo（20×20），无文字无 chevron
 * - 下拉列表项同步展示 logo + 引擎名，与触发按钮视觉一致
 * - 自定义引擎未配图标时回退地球图标
 * - tooltip 提供引擎名（无文字时的 fallback）
 * - 切换持久化到 UserPreference 表，并通过 onChange 通知 SearchBox
 */
export function EngineSwitcher({
  initialEngine,
  engines,
  onChange,
}: EngineSwitcherProps) {
  const [engine, setEngine] = useState<SearchEngine>(initialEngine);

  const currentConfig = engines.find((e) => e.key === engine) ?? engines[0];

  const handleChange = async (key: SearchEngine) => {
    setEngine(key);
    onChange?.(key);

    // 持久化到服务端
    try {
      await preferencesApi.update('searchEngine', key);
    } catch (e) {
      console.error('保存搜索引擎失败', e);
    }
  };

  const items = engines.map((e) => ({
    label: e.name,
    onClick: () => handleChange(e.key),
    icon: <EngineIcon engine={e} size={20} />,
  }));

  return (
    <DropdownMenu
      button={{
        label: currentConfig.name,
        variant: 'ghost',
        size: 'sm',
        isIconOnly: true,
        icon: <EngineIcon engine={currentConfig} size={20} />,
        tooltip: currentConfig.name,
      }}
      hasChevron={false}
      items={items}
      menuWidth={180}
    />
  );
}

/** 引擎图标：有 logo 用图片，无 logo（自定义未配图标）回退地球图标 */
function EngineIcon({
  engine,
  size,
}: {
  engine: SearchEngineConfig;
  size: number;
}) {
  if (!engine.logo) {
    return <Globe size={size} className="shrink-0 text-secondary" />;
  }
  return (
    <Image
      src={engine.logo}
      alt={engine.name}
      width={size}
      height={size}
      unoptimized
      className="shrink-0"
    />
  );
}
