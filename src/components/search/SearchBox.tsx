'use client';

import { useState } from 'react';
import { EngineSwitcher } from '@/components/search/EngineSwitcher';
import type { SearchEngine } from '@/types';
import { SEARCH_ENGINES } from '@/types';

interface SearchBoxProps {
  /** 初始引擎（SSR 时从 UserPreference 读取） */
  initialEngine?: SearchEngine;
}

/**
 * 独立居中搜索框（主流导航站风格）
 *
 * 设计要点：
 * - 大尺寸：640px 宽，52px 高，胶囊圆角
 * - 双层阴影：低高度 base + focus 时强化
 * - 用 CSS focus-within 实现 focus 反馈（避免 React state 时序问题）
 * - 左侧 EngineSwitcher（icon-only 引擎 logo）+ 分隔线 + 输入框 + 右侧 Cmd+K 提示
 *
 * 引擎 logo 由 EngineSwitcher 内部 button 承载（不在搜索框中间再放一次），
 * 切换引擎时 logo 跟随 state 变化，tooltip 提供引擎名 fallback。
 *
 * 行为：
 * - 输入关键词回车后在新标签页跳转当前引擎
 * - 引擎持久化到 UserPreference 表
 * - Cmd+K 由 FloatingToolbar 全局监听并唤起 CmdKModal
 */
export function SearchBox({ initialEngine = 'google' }: SearchBoxProps) {
  const [keyword, setKeyword] = useState('');
  const [engine, setEngine] = useState<SearchEngine>(initialEngine);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    const config =
      SEARCH_ENGINES.find((c) => c.key === engine) ?? SEARCH_ENGINES[0];
    window.open(
      config.urlTemplate + encodeURIComponent(keyword.trim()),
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <search className="mx-auto w-full max-w-[640px]">
    <form
      onSubmit={handleSubmit}
    >
      <div className="group flex items-center h-[52px] rounded-full bg-surface border-2 border-border shadow-md shadow-black/5 transition-all duration-200 hover:shadow-lg hover:border-accent/60 focus-within:border-accent focus-within:shadow-lg focus-within:ring-4 focus-within:ring-accent/20">
        {/* 左侧引擎切换器（icon-only：当前引擎 logo，点击切换） */}
        <div className="pl-2 flex items-center">
          <EngineSwitcher initialEngine={engine} onChange={setEngine} />
        </div>

        {/* 分隔线 */}
        <div className="h-6 w-px bg-border mx-2" />

        {/* 输入框 */}
        <input
          type="text"
          aria-label="搜索"
          placeholder="搜索卡片，或输入关键词跳转搜索引擎..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 h-full bg-transparent outline-none text-base text-primary placeholder:text-secondary min-w-0"
        />

        {/* 右侧 Cmd+K 提示 */}
        <div className="pr-4 flex items-center gap-2 shrink-0">
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-hover border border-border text-xs text-secondary font-mono">
            <span>⌘</span>
            <span>K</span>
          </kbd>
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              aria-label="清除"
              className="text-secondary hover:text-primary text-base"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </form>
    </search>
  );
}
