'use client';

import {useState} from 'react';
import {HStack} from '@astryxdesign/core/HStack';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Search} from 'lucide-react';
import {SEARCH_ENGINES} from '@/types';
import type {SearchEngine} from '@/types';
import {EngineSwitcher} from '@/components/search/EngineSwitcher';

interface SearchBoxProps {
  /** 初始引擎（SSR 时从 UserPreference 读取） */
  initialEngine?: SearchEngine;
}

/**
 * 独立居中搜索框
 *
 * 结构：
 * - 左侧：EngineSwitcher（5 引擎切换器）
 * - 右侧：搜索输入框（占满剩余宽度）
 *
 * 行为：
 * - 输入关键词回车后在新标签页跳转当前引擎
 * - 引擎持久化到 UserPreference 表
 * - Cmd+K 由 FloatingToolbar 全局监听并唤起 CmdKModal
 */
export function SearchBox({initialEngine = 'google'}: SearchBoxProps) {
  const [keyword, setKeyword] = useState('');
  const [engine, setEngine] = useState<SearchEngine>(initialEngine);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    const config = SEARCH_ENGINES.find((c) => c.key === engine) ?? SEARCH_ENGINES[0];
    window.open(config.urlTemplate + encodeURIComponent(keyword.trim()), '_blank', 'noopener,noreferrer');
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[560px]">
      <HStack gap={2} align="center" className="w-full">
        <EngineSwitcher initialEngine={engine} onChange={setEngine} />
        <div className="flex-1">
          <TextInput
            label="搜索"
            isLabelHidden
            placeholder="输入关键词，回车跳转搜索引擎..."
            value={keyword}
            onChange={setKeyword}
            width="100%"
            startIcon={<Search size={16} />}
            hasClear
          />
        </div>
      </HStack>
    </form>
  );
}
