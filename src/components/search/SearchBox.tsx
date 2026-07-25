'use client';

import {useState} from 'react';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Search} from 'lucide-react';
import {SEARCH_ENGINES} from '@/types';

/**
 * 独立居中搜索框
 * - 与 Logo/设置分行，独立悬浮于顶栏下方
 * - 居中展示，宽度 560px（参考用户偏好）
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
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[560px]">
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
