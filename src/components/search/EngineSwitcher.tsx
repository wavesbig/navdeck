'use client';

import {useState} from 'react';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {SEARCH_ENGINES} from '@/types';
import type {SearchEngine} from '@/types';

interface EngineSwitcherProps {
  /** 初始引擎 key（SSR 时从 UserPreference 读取，避免客户端闪烁） */
  initialEngine: SearchEngine;
  /** 引擎切换回调（SearchBox 监听用于回车跳转） */
  onChange?: (engine: SearchEngine) => void;
}

/**
 * 搜索引擎切换器
 *
 * - 5 引擎：Google / Bing / 百度 / GitHub / Stack Overflow
 * - DropdownMenu 触发，items 数组直接传入
 * - 当前引擎持久化到 UserPreference 表
 * - 切换后通过 onChange 通知 SearchBox
 */
export function EngineSwitcher({initialEngine, onChange}: EngineSwitcherProps) {
  const [engine, setEngine] = useState<SearchEngine>(initialEngine);

  const currentConfig = SEARCH_ENGINES.find((e) => e.key === engine) ?? SEARCH_ENGINES[0];

  const handleChange = async (key: SearchEngine) => {
    setEngine(key);
    onChange?.(key);

    // 持久化到服务端
    try {
      await fetch('/api/preferences', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({key: 'searchEngine', value: key}),
      });
    } catch (e) {
      console.error('保存搜索引擎失败', e);
    }
  };

  const items = SEARCH_ENGINES.map((e) => ({
    label: e.name,
    onClick: () => handleChange(e.key),
  }));

  return (
    <DropdownMenu
      button={{
        label: currentConfig.name,
        variant: 'ghost',
        size: 'sm',
      }}
      hasChevron
      items={items}
      menuWidth={160}
    />
  );
}
