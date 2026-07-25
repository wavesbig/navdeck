'use client';

import {useState} from 'react';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Search} from 'lucide-react';
import {SEARCH_ENGINES} from '@/types';

/**
 * 顶部居中搜索框
 * - 撑满 Header 中部可用空间（max-w-2xl 限制极限宽度避免过长）
 * - 引擎切换器在左侧（M1.8 实现，M1.3 先占位默认 Google）
 * - 输入关键词回车后在新标签页跳转对应引擎
 * - 当前选中引擎通过 localStorage 持久化
 *
 * M1.3 阶段：仅占位，输入回车跳转 Google
 * M1.8 阶段：补全引擎切换器 + Cmd+K Modal
 */
export function SearchBox() {
  const [keyword, setKeyword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    const engine = SEARCH_ENGINES[0]; // M1.3 占位：默认 Google
    window.open(engine.urlTemplate + encodeURIComponent(keyword.trim()), '_blank');
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-2xl mx-auto w-full">
      <TextInput
        label="搜索"
        isLabelHidden
        placeholder="搜索卡片或输入关键词..."
        value={keyword}
        onChange={setKeyword}
        width="100%"
        startIcon={<Search size={16} />}
        hasClear
      />
    </form>
  );
}
