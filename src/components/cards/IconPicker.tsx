'use client';

import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Popover } from '@astryxdesign/core/Popover';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Globe, Library, Search, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface IconPickerProps {
  /** 当前图标值（URL 或文本） */
  value: string;
  /** 卡片名称，用于自动抓取时的预览回退 */
  cardName?: string;
  /** 用于自动抓取 favicon 的 URL（通常是 internalUrl 或 externalUrl） */
  sourceUrl?: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
}

interface LibraryItem {
  name: string;
  label: string;
  category: string;
  url: string;
}

/**
 * 图标选择器
 *
 * 三种来源互斥（后选覆盖先选）：
 * 1. 自动抓取：从 sourceUrl 拉取 favicon（debounce 500ms）
 * 2. 上传：用户选择本地图片，POST /api/icons/upload
 * 3. 图标库：从内置 manifest 搜索选择
 *
 * 还允许手动输入 URL/文本作为图标值
 */
export function IconPicker({
  value,
  cardName,
  sourceUrl,
  onChange,
}: IconPickerProps) {
  const [grabbing, setGrabbing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 自动抓取 favicon（用户填完 URL 后触发，不是自动触发）
  const handleGrabFavicon = useCallback(async () => {
    if (!sourceUrl) {
      setError('请先填写内网或外网地址');
      return;
    }
    setGrabbing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/icons/favicon?url=${encodeURIComponent(sourceUrl)}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '抓取失败');
        return;
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
    } catch {
      setError('网络错误');
    } finally {
      setGrabbing(false);
    }
  }, [sourceUrl, onChange]);

  // 上传图标
  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = ''; // 允许重复选择同一文件

      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('scope', 'cards');

        const res = await fetch('/api/icons/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? '上传失败');
          return;
        }
        const data = (await res.json()) as { path: string };
        onChange(data.path);
      } catch {
        setError('网络错误');
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  return (
    <VStack gap={2}>
      <HStack gap={2} align="center">
        {/* 图标预览 */}
        <IconPreview value={value} fallback={cardName} />

        <VStack gap={1} className="flex-1 min-w-0">
          <TextInput
            label="图标"
            placeholder="URL / 文本占位"
            value={value}
            onChange={onChange}
            width="100%"
          />
          {error && (
            <Text size="sm" className="text-danger">
              {error}
            </Text>
          )}
        </VStack>
      </HStack>

      {/* 三种来源按钮 */}
      <HStack gap={2}>
        <Button
          label={grabbing ? '抓取中...' : '抓取 favicon'}
          variant="ghost"
          size="sm"
          icon={<Globe size={14} />}
          onClick={handleGrabFavicon}
          isDisabled={grabbing || !sourceUrl}
        />

        {/* 文件上传按钮 */}
        <label className="inline-flex items-center gap-1 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-sm text-primary rounded-md border border-border hover:bg-overlay-hover transition-colors">
            <Upload size={14} />
            <span>{uploading ? '上传中...' : '上传图标'}</span>
          </span>
        </label>

        {/* 图标库浮层 */}
        <IconLibraryPicker onSelect={onChange} />
      </HStack>
    </VStack>
  );
}

/** 图标预览（图片或字母占位） */
function IconPreview({
  value,
  fallback,
}: {
  value: string;
  fallback?: string;
}) {
  const isUrl =
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/api/icons/file');

  if (isUrl) {
    return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-border bg-surface overflow-hidden flex-shrink-0">
        <img
          src={value}
          alt="图标"
          className="w-full h-full object-contain"
          onError={(e) => {
            // 加载失败时显示首字母占位
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </span>
    );
  }

  // 文本占位：取首字母或第一个字符
  const letter = (value || fallback || '?').charAt(0).toUpperCase();
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-border bg-surface text-base font-medium flex-shrink-0">
      {letter}
    </span>
  );
}

interface IconLibraryPickerProps {
  onSelect: (url: string) => void;
}

/** 图标库选择浮层 */
function IconLibraryPicker({ onSelect }: IconLibraryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 搜索（debounce 200ms），在 setTimeout 回调中 setState 避免级联渲染
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/icons/library?q=${encodeURIComponent(query.trim())}&limit=60`,
        );
        if (res.ok) {
          const data = (await res.json()) as { items: LibraryItem[] };
          setItems(data.items);
        }
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isOpen]);

  const handleSelect = (item: LibraryItem) => {
    onSelect(item.url);
    setIsOpen(false);
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      content={
        <VStack gap={2} className="p-3 w-[320px]">
          <Text size="sm" weight="medium">
            图标库
          </Text>
          <TextInput
            label="搜索图标"
            isLabelHidden
            placeholder="搜索服务名..."
            value={query}
            onChange={setQuery}
            width="100%"
            startIcon={<Search size={14} />}
          />

          <div className="max-h-[280px] overflow-y-auto -mx-1 px-1">
            {loading && items.length === 0 ? (
              <Text size="sm" color="secondary" className="py-4 text-center">
                加载中...
              </Text>
            ) : items.length === 0 ? (
              <Text size="sm" color="secondary" className="py-4 text-center">
                未找到匹配的图标
              </Text>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {items.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleSelect(item)}
                    title={`${item.label} (${item.category})`}
                    className="flex flex-col items-center justify-center p-1.5 rounded-md border border-transparent hover:border-border hover:bg-overlay-hover transition-colors"
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      className="w-7 h-7 object-contain"
                      loading="lazy"
                    />
                    <Text
                      size="2xs"
                      color="secondary"
                      className="mt-1 truncate w-full text-center"
                    >
                      {item.label}
                    </Text>
                  </button>
                ))}
              </div>
            )}
          </div>
        </VStack>
      }
      width={340}
      placement="below"
    >
      <Button
        label="图标库"
        variant="ghost"
        size="sm"
        icon={<Library size={14} />}
      />
    </Popover>
  );
}
