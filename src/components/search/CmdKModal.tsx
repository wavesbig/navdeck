'use client';

import { Dialog } from '@astryxdesign/core/Dialog';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { ExternalLink, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { highlightField } from '@/lib/search';
import type { Card } from '@/types';

interface SearchMatch {
  field: 'name' | 'url' | 'description';
  start: number;
  end: number;
}

interface SearchResultItem {
  card: Card;
  matches: SearchMatch[];
  score: number;
}

interface CmdKModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cmd+K 快捷搜索 Modal
 *
 * - 全局快捷键 Cmd+K（Mac）/ Ctrl+K（Windows）唤起
 * - 实时搜索（debounce 200ms），服务端匹配卡片
 * - 匹配规则：子串 + 拼音 + 首字母缩写（不区分大小写）
 * - 键盘导航：上下箭头切换选中 + Enter 跳转
 * - 命中字段高亮（name / url / description）
 * - 跳转后 Modal 自动关闭
 */
export function CmdKModal({ isOpen, onOpenChange }: CmdKModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 包装 onOpenChange：关闭时同步重置状态（在事件回调里 setState，避免 effect cascading render）
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
        setIsLoading(false);
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  // query 变化时同步清空逻辑放在 onChange 回调里，effect 只负责 fetch
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setSelectedIndex(0);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  };

  // 实时搜索（debounce 200ms）
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (!query.trim()) {
      return;
    }
    const currentQuery = query;
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(currentQuery.trim())}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const data = (await res.json()) as { items: SearchResultItem[] };
          setResults(data.items);
          setSelectedIndex(0);
        }
      } catch (e) {
        console.error('搜索失败', e);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  // 跳转到卡片 URL（新标签页，外网优先）
  const handleNavigate = useCallback(
    (card: Card) => {
      const url = card.externalUrl || card.internalUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      handleOpenChange(false);
    },
    [handleOpenChange],
  );

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item) {
        handleNavigate(item.card);
      }
    }
  };

  // 选中项滚动到可见区域
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector('[data-selected="true"]');
    if (selected && 'scrollIntoView' in selected) {
      (selected as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, []);

  const showEmpty = query.trim() !== '' && !isLoading && results.length === 0;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      width={560}
      maxHeight="60vh"
      purpose="form"
    >
      <VStack gap={3} className="p-4">
        <TextInput
          label="搜索卡片"
          isLabelHidden
          placeholder="输入卡片名称、URL 或描述（支持拼音 / 首字母缩写）"
          value={query}
          onChange={handleQueryChange}
          width="100%"
          startIcon={<Search size={16} />}
          hasClear
          hasAutoFocus
          onKeyDown={handleKeyDown}
        />

        {/* 结果列表 */}
        {query.trim() === '' ? null : isLoading ? (
          <Text size="sm" color="secondary">
            搜索中…
          </Text>
        ) : showEmpty ? (
          <Text size="sm" color="secondary">
            未找到匹配的卡片
          </Text>
        ) : (
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto -mx-2">
            {results.map((item, idx) => {
              const nameMatch = item.matches.find((m) => m.field === 'name');
              const urlMatch = item.matches.find((m) => m.field === 'url');
              const urlText = item.card.externalUrl || item.card.internalUrl;
              const nameParts = highlightField(item.card.name, nameMatch);
              const urlParts = highlightField(urlText, urlMatch);
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.card.id}
                  type="button"
                  data-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleNavigate(item.card)}
                  className="w-full text-left px-3 py-2 rounded-md flex items-center gap-3 hover:bg-surface-hover data-[selected=true]:bg-surface-hover transition-colors"
                >
                  <ExternalLink
                    size={14}
                    className="text-secondary shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary truncate">
                      {nameParts.map((part) =>
                        typeof part === 'string' ? (
                          <span key={`n-s-${part.slice(0, 12)}`}>{part}</span>
                        ) : (
                          <mark
                            key={`n-m-${part.highlight.slice(0, 12)}`}
                            className="bg-warning/30 text-primary rounded px-0.5"
                          >
                            {part.highlight}
                          </mark>
                        ),
                      )}
                    </div>
                    {urlText && (
                      <div className="text-xs text-secondary truncate mt-0.5">
                        {urlParts.map((part) =>
                          typeof part === 'string' ? (
                            <span key={`u-s-${part.slice(0, 12)}`}>{part}</span>
                          ) : (
                            <mark
                              key={`u-m-${part.highlight.slice(0, 12)}`}
                              className="bg-warning/30 text-primary rounded px-0.5"
                            >
                              {part.highlight}
                            </mark>
                          ),
                        )}
                      </div>
                    )}
                    {item.card.description && (
                      <div className="text-xs text-secondary truncate mt-0.5">
                        {item.card.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 底部键盘提示 */}
        {results.length > 0 && (
          <Text size="2xs" color="secondary">
            ↑↓ 选择 · Enter 跳转 · Esc 关闭
          </Text>
        )}
      </VStack>
    </Dialog>
  );
}
