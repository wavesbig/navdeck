'use client';

import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Globe, Library, Search, Upload } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconImage } from '@/components/icons/IconImage';
import { useFileUpload } from '@/hooks/useFileUpload';
import { ApiError } from '@/lib/request/ApiError';
import { iconsApi } from '@/services';

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
      const data = await iconsApi.getFavicon(sourceUrl);
      onChange(data.url);
    } catch (e) {
      if (e instanceof ApiError && e.isNetworkError) {
        setError('网络错误');
      } else {
        setError(e instanceof ApiError ? e.message : '抓取失败');
      }
    } finally {
      setGrabbing(false);
    }
  }, [sourceUrl, onChange]);

  const upload = useFileUpload({
    accept: 'image/*',
    onFile: async (file) => {
      const data = await iconsApi.upload(file, 'cards');
      onChange(data.path);
    },
  });
  const displayError = error ?? upload.error;
  return (
    <VStack gap={1.5} width="100%">
      {/* label：与表单其他字段一致的"label 在上"结构 */}
      <Text size="sm" weight="medium" as="label">
        图标
      </Text>

      {/* 图标区整体卡片：预览 + 输入框 + 按钮行，视觉上是一个整体 */}
      <div className="rounded-panel border border-border bg-surface p-3">
        <HStack gap={3} align="start" width="100%">
          <IconImage
            icon={value}
            name={value || cardName}
            size={64}
            imageClassName="rounded-widget border border-border bg-surface"
            fallbackClassName="rounded-widget border border-border bg-surface text-primary"
          />

          <VStack gap={2} className="flex-1 min-w-0">
            <TextInput
              label="图标地址"
              placeholder="选填，留空显示名称首字母"
              value={value}
              onChange={onChange}
              width="100%"
              isLabelHidden
            />

            <HStack gap={1} align="center" vAlign="center">
              <IconButton
                label={grabbing ? '抓取中…' : '抓取 favicon'}
                tooltip="抓取 favicon"
                variant="ghost"
                size="sm"
                icon={<Globe size={16} />}
                onClick={handleGrabFavicon}
                isDisabled={grabbing || !sourceUrl}
                isLoading={grabbing}
              />

              <IconButton
                label={upload.uploading ? '上传中…' : '上传图标'}
                tooltip="上传图标"
                variant="ghost"
                size="sm"
                icon={<Upload size={16} />}
                onClick={() => upload.open()}
                isDisabled={upload.uploading}
                isLoading={upload.uploading}
              />
              {upload.input}
              <IconLibraryPicker onSelect={onChange} />

              {displayError && (
                <Text size="sm" className="text-danger ml-1">
                  {displayError}
                </Text>
              )}
            </HStack>
          </VStack>
        </HStack>
      </div>
    </VStack>
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
        const data = await iconsApi.searchLibrary(query.trim(), 60);
        setItems(data.items as LibraryItem[]);
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
      label="选择卡片图标"
      content={
        <VStack gap={2} className="p-3 w-[320px]">
          <Text size="sm" weight="medium">
            图标库
          </Text>
          <TextInput
            label="搜索图标"
            isLabelHidden
            placeholder="搜索服务名…"
            value={query}
            onChange={setQuery}
            width="100%"
            startIcon={<Search size={14} />}
          />

          <div className="max-h-[280px] overflow-y-auto -mx-1 px-1">
            {loading && items.length === 0 ? (
              <Text size="sm" color="secondary" className="py-4 text-center">
                加载中…
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
                    className="flex flex-col items-center justify-center p-1.5 rounded-control border border-transparent hover:border-border hover:bg-overlay-hover transition-colors"
                  >
                    <Image
                      src={item.url}
                      alt={item.label}
                      width={28}
                      height={28}
                      loading="lazy"
                      className="size-7 object-contain"
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
      <IconButton
        label="图标库"
        tooltip="图标库"
        variant="ghost"
        size="sm"
        icon={<Library size={16} />}
      />
    </Popover>
  );
}
