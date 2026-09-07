'use client';

import { Button } from '@astryxdesign/core/Button';
import { ComplexSelector } from '@astryxdesign/core/ComplexSelector';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { Plus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { categoriesApi } from '@/services';
import type { Category } from '@/types';

interface CategorySelectorProps {
  categories: Category[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  isOptional?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  status?: { type: 'error' | 'warning' | 'success'; message?: string };
}

interface SelectValue {
  id: string;
  label: string;
}

const UNCATEGORIZED: SelectValue = { id: '', label: '未分类' };

/** 浮层最小宽度：内容可读下限（窄触发器时不至于过窄） */
const MIN_PANEL_WIDTH = 240;

/**
 * 分类选择器（popover 内搜索 + 内联创建）
 *
 * 浏览模式：搜索 + 列表 + 底部创建入口
 * 创建模式：输入框 + 确认/取消，popover 内切换不关闭
 */
export function CategorySelector({
  categories,
  value,
  onChange,
  label = '分类',
  description,
  isOptional,
  isRequired,
  isDisabled,
  status,
}: CategorySelectorProps) {
  const showToast = useToast();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'browse' | 'create'>('browse');
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [localCreated, setLocalCreated] = useState<Category[]>([]);
  // 浮层经 portal 渲染，CSS 继承/变量无法穿透；打开时实测触发器宽度同步给内容
  const fieldRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(MIN_PANEL_WIDTH);

  const merged = useMemo(
    () => [
      ...categories,
      ...localCreated.filter((lc) => !categories.some((c) => c.id === lc.id)),
    ],
    [categories, localCreated],
  );

  const selected = useMemo((): SelectValue => {
    if (!value) return UNCATEGORIZED;
    const found = merged.find((c) => c.id === value);
    return found ? { id: found.id, label: found.name } : UNCATEGORIZED;
  }, [value, merged]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((c) => c.name.toLowerCase().includes(q));
  }, [merged, query]);

  const handleCreate = async (
    commit: (v: SelectValue) => void,
    close: () => void,
  ) => {
    const name = newName.trim();
    if (!name || isCreating) return;
    setIsCreating(true);
    try {
      const created = await categoriesApi.create({ name });
      setLocalCreated((prev) => [...prev, created]);
      commit({ id: created.id, label: created.name });
      close();
      setMode('browse');
      setNewName('');
      setQuery('');
      showToast({ body: `已创建分类「${name}」`, type: 'info' });
    } catch {
      showToast({ body: '创建分类失败', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const backToBrowse = () => {
    setMode('browse');
    setNewName('');
  };

  return (
    <div ref={fieldRef}>
      <ComplexSelector<SelectValue>
        label={label}
        value={selected}
        onChange={(v) => onChange(v.id)}
        triggerLabel={selected.label}
        placeholder="选择分类"
        isDisabled={isDisabled}
        isRequired={isRequired}
        isOptional={isOptional}
        description={description}
        status={status}
        width="100%"
        variant="input"
        onOpenChange={(open) => {
          if (open) {
            setPanelWidth(
              Math.max(
                fieldRef.current?.offsetWidth ?? MIN_PANEL_WIDTH,
                MIN_PANEL_WIDTH,
              ),
            );
          }
        }}
      >
        {(_v, commit, close) => {
          if (mode === 'create') {
            return (
              // 动态宽度与触发器对齐（JS 实测值，Tailwind 任意值类无法动态编译）
              <div className="p-3" style={{ width: panelWidth }}>
                <p className="pb-2 text-xs font-medium text-tertiary">
                  新建分类
                </p>
                <TextInput
                  value={newName}
                  onChange={setNewName}
                  placeholder="输入分类名称"
                  isLabelHidden
                  label="新分类名称"
                  hasAutoFocus
                  isDisabled={isCreating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreate(commit, close);
                    }
                  }}
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    label="取消"
                    variant="ghost"
                    size="sm"
                    onClick={backToBrowse}
                    isDisabled={isCreating}
                  />
                  <Button
                    label="确认"
                    variant="primary"
                    size="sm"
                    onClick={() => handleCreate(commit, close)}
                    isLoading={isCreating}
                    isDisabled={isCreating || !newName.trim()}
                  />
                </div>
              </div>
            );
          }

          return (
            <div className="flex flex-col" style={{ width: panelWidth }}>
              <div className="p-2 pb-3">
                <TextInput
                  value={query}
                  onChange={setQuery}
                  placeholder="搜索分类..."
                  isLabelHidden
                  label="搜索分类"
                />
              </div>
              <Divider variant="subtle" />
              <div className="max-h-44 overflow-y-auto p-1">
                <OptionRow
                  label="未分类"
                  active={selected.id === ''}
                  onClick={() => {
                    commit(UNCATEGORIZED);
                    close();
                    setQuery('');
                  }}
                />
                {filtered.map((c) => (
                  <OptionRow
                    key={c.id}
                    label={c.name}
                    active={selected.id === c.id}
                    onClick={() => {
                      commit({ id: c.id, label: c.name });
                      close();
                      setQuery('');
                    }}
                  />
                ))}
                {merged.length === 0 ? (
                  <p className="px-3 py-3 text-center text-xs text-tertiary">
                    还没有分类，可点击下方新建
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="px-3 py-3 text-center text-xs text-tertiary">
                    未找到匹配的分类
                  </p>
                ) : null}
              </div>
              <Divider variant="subtle" />
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNewName(query.trim());
                    setMode('create');
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/8 cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2} />
                  新建分类
                </button>
              </div>
            </div>
          );
        }}
      </ComplexSelector>
    </div>
  );
}

function OptionRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-md px-2.5 py-2 text-sm cursor-pointer transition-colors ${
        active
          ? 'bg-accent/10 font-medium text-accent'
          : 'text-primary hover:bg-surface-hover'
      }`}
    >
      {label}
    </button>
  );
}
