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
 * - 触发按钮 icon-only：只显示当前引擎 logo（24×24），无文字无 chevron
 * - 下拉列表项同步展示 logo + 引擎名，与触发按钮视觉一致
 * - tooltip 提供引擎名（无文字时的 fallback）
 * - 切换持久化到 UserPreference 表，并通过 onChange 通知 SearchBox
 *
 * 设计：搜索框空间宝贵，logo 自带辨识度（Google 的 G、GitHub Octocat），
 * 去文字 + 去 chevron 让 button 更紧凑，logo 直接成为视觉锚点。
 * 列表项保留 logo + 文字，便于用户辨认不熟悉的引擎。
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
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={e.logo}
        alt={e.name}
        width={18}
        height={18}
        className="shrink-0"
      />
    ),
  }));

  return (
    <DropdownMenu
      button={{
        label: currentConfig.name,
        variant: 'ghost',
        size: 'sm',
        isIconOnly: true,
        icon: (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentConfig.logo}
            alt={currentConfig.name}
            width={24}
            height={24}
            className="shrink-0"
          />
        ),
        tooltip: currentConfig.name,
      }}
      hasChevron={false}
      items={items}
      menuWidth={180}
    />
  );
}
