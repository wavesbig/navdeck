'use client';

import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Library,
  Search,
  Upload,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconImage } from '@/components/icons/IconImage';
import { getIconRecommendations } from '@/lib/icon-recommend';
import { getIconSource } from '@/lib/icon-source';
import { ApiError } from '@/lib/request/ApiError';
import { iconsApi } from '@/services';

interface IconPickerProps {
  value: string;
  cardName?: string;
  sourceUrl?: string;
  onChange: (value: string) => void;
  onUploadSelectionChange?: (selection: IconUploadSelection | null) => void;
  uploadSelection?: IconUploadSelection | null;
  disabled?: boolean;
}

export interface IconUploadSelection {
  file: File;
  previewUrl: string;
}

interface LibraryItem {
  name: string;
  label: string;
  url: string;
}

const ICON_PAGE_SIZE = 60;
const MAX_ICON_SIZE = 5 * 1024 * 1024;
const ACCEPTED_ICON_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);
const ACCEPT_ATTRIBUTE =
  'image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon';

let libraryCache: LibraryItem[] | null = null;
let libraryRequest: Promise<LibraryItem[]> | null = null;

async function loadLibraryCatalog(): Promise<LibraryItem[]> {
  if (libraryCache) return libraryCache;

  libraryRequest ??= iconsApi
    .getLibrary()
    .then(({ items }) => {
      const sorted = [...items].sort(
        (a, b) =>
          a.label.localeCompare(b.label, 'zh-Hans-CN', {
            sensitivity: 'base',
          }) || a.name.localeCompare(b.name),
      );
      libraryCache = sorted;
      return sorted;
    })
    .catch((error) => {
      libraryRequest = null;
      throw error;
    });

  return libraryRequest;
}

function useLibraryCatalog() {
  const [icons, setIcons] = useState<LibraryItem[] | null>(libraryCache);
  const [isLoading, setIsLoading] = useState(!libraryCache);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (libraryCache) {
      setIcons(libraryCache);
      return;
    }

    setIsLoading(true);
    try {
      setIcons(await loadLibraryCatalog());
      setLoadError(null);
    } catch {
      setLoadError('图标库加载失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { icons, isLoading, loadError, load };
}

export function IconPicker({
  value,
  cardName,
  sourceUrl,
  onChange,
  onUploadSelectionChange,
  uploadSelection,
  disabled = false,
}: IconPickerProps) {
  const latestIntentRef = useRef(0);
  const [faviconStatus, setFaviconStatus] = useState<
    'idle' | 'pending' | 'error'
  >('idle');
  const [faviconError, setFaviconError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadSelectionRef = useRef<IconUploadSelection | null>(
    uploadSelection,
  );
  const { icons: libraryIcons } = useLibraryCatalog();

  // 文件选择取消的 cancel 会冒泡到外层 Dialog，被误判为关闭请求。
  useEffect(() => {
    const input = uploadInputRef.current;
    if (!input) return;

    const stopCancel = (event: Event) => event.stopPropagation();
    input.addEventListener('cancel', stopCancel);
    return () => input.removeEventListener('cancel', stopCancel);
  }, []);

  const activeUpload =
    uploadSelection?.previewUrl === value ? uploadSelection : null;
  const iconSource = activeUpload ? 'upload' : getIconSource(value);
  const isBusy = disabled;

  const applyIcon = useCallback(
    (nextValue: string) => {
      latestIntentRef.current += 1;
      setFaviconError(null);
      onChange(nextValue);
    },
    [onChange],
  );

  const handleGrabFavicon = useCallback(async () => {
    if (isBusy || !sourceUrl) return;

    const intentToken = ++latestIntentRef.current;
    setFaviconStatus('pending');
    setFaviconError(null);
    try {
      const data = await iconsApi.getFavicon(sourceUrl);
      if (intentToken !== latestIntentRef.current) return;
      applyIcon(data.url);
    } catch (error) {
      if (intentToken !== latestIntentRef.current) return;
      setFaviconStatus('error');
      setFaviconError(
        error instanceof ApiError && error.isNetworkError
          ? '网络错误，favicon 抓取失败'
          : '无法获取 favicon',
      );
    } finally {
      if (intentToken === latestIntentRef.current) {
        setFaviconStatus('idle');
      }
    }
  }, [applyIcon, isBusy, sourceUrl]);

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (isBusy) return;

      if (!ACCEPTED_ICON_TYPES.has(file.type)) {
        setUploadError('仅支持 PNG、JPG、WebP、GIF 或 ICO 图标');
        return;
      }
      if (file.size > MAX_ICON_SIZE) {
        setUploadError('图标文件过大，最大 5MB');
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      if (uploadSelectionRef.current) {
        URL.revokeObjectURL(uploadSelectionRef.current.previewUrl);
      }

      const selection: IconUploadSelection = { file, previewUrl };
      uploadSelectionRef.current = selection;
      onUploadSelectionChange?.(selection);
      setUploadError(null);
      applyIcon(previewUrl);
    },
    [applyIcon, isBusy, onUploadSelectionChange],
  );

  useEffect(() => {
    uploadSelectionRef.current = uploadSelection;
  }, [uploadSelection]);

  useEffect(() => {
    const selection = uploadSelection;
    if (!selection || selection.previewUrl === value) return;

    URL.revokeObjectURL(selection.previewUrl);
    uploadSelectionRef.current = null;
    onUploadSelectionChange?.(null);
  }, [onUploadSelectionChange, uploadSelection, value]);

  const recommendations = useMemo(
    () => getIconRecommendations(libraryIcons ?? [], cardName, sourceUrl, 3),
    [cardName, libraryIcons, sourceUrl],
  );

  const sourceLabels: Record<string, string> = {
    empty: '名称首字母',
    library: '图标库',
    upload: activeUpload ? '本地上传（保存时提交）' : '本地上传',
    link: '外部链接',
    manual: '自定义文本',
  };
  const errorMessage = faviconError ?? uploadError;

  return (
    <VStack gap={1.5} width="100%">
      <Text size="sm" weight="medium" as="label">
        图标
      </Text>

      <div className="rounded-panel border border-border bg-surface p-3">
        <HStack gap={3} align="start" width="100%">
          <IconImage
            key={value}
            icon={value}
            name={cardName || value}
            size={64}
            imageClassName="rounded-widget border border-border bg-surface"
            fallbackClassName="rounded-widget border border-border bg-surface text-primary"
          />

          <VStack gap={2} className="min-w-0 flex-1">
            <Text size="2xs" color="secondary">
              当前来源：{sourceLabels[iconSource] ?? '自定义'}
            </Text>

            <TextInput
              label="图标地址"
              placeholder="选填，留空显示名称首字母"
              value={value}
              onChange={applyIcon}
              width="100%"
              isLabelHidden
              isDisabled={isBusy}
            />

            <HStack gap={1} align="center" vAlign="center">
              <IconButton
                label="抓取 favicon"
                tooltip="抓取 favicon"
                variant="ghost"
                size="sm"
                icon={<Globe size={16} />}
                onClick={() => void handleGrabFavicon()}
                isDisabled={isBusy || faviconStatus === 'pending' || !sourceUrl}
                isLoading={faviconStatus === 'pending'}
              />

              <IconButton
                label="选择本地图标文件"
                tooltip="选择本地图标文件"
                variant="ghost"
                size="sm"
                icon={<Upload size={16} />}
                onClick={() => uploadInputRef.current?.click()}
                isDisabled={isBusy}
              />
              <input
                ref={uploadInputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void handleUploadFile(file);
                }}
              />

              <IconLibraryPicker
                value={value}
                onSelect={applyIcon}
                cardName={cardName}
                sourceUrl={sourceUrl}
                disabled={isBusy}
              />

              {value && (
                <IconButton
                  label="清除图标"
                  tooltip="清除图标"
                  variant="ghost"
                  size="sm"
                  icon={<X size={16} />}
                  isDisabled={isBusy}
                  onClick={() => applyIcon('')}
                />
              )}
            </HStack>

            {recommendations.length > 0 && (
              <VStack gap={1} className="items-start">
                <Text size="2xs" color="secondary">
                  根据名称 / 地址推荐
                </Text>
                <HStack gap={1} align="center" vAlign="center">
                  {recommendations.map((item) => {
                    const isSelected = item.url === value;
                    return (
                      <button
                        key={`recommended-${item.name}`}
                        type="button"
                        onClick={() => applyIcon(item.url)}
                        title={`推荐：${item.label}`}
                        aria-pressed={isSelected}
                        disabled={isBusy}
                        className={`relative flex flex-col items-center justify-center rounded-control border p-1.5 transition-colors ${
                          isSelected
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-transparent hover:border-border hover:bg-overlay-hover'
                        }`}
                      >
                        <Image
                          src={item.url}
                          alt=""
                          width={28}
                          height={28}
                          loading="eager"
                          decoding="async"
                          unoptimized
                          className="size-7 object-contain"
                        />
                        <Text
                          size="2xs"
                          color="secondary"
                          className="mt-1 w-full truncate text-center"
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Check
                            aria-hidden
                            className="absolute right-0.5 top-0.5 size-3 text-accent"
                          />
                        )}
                      </button>
                    );
                  })}
                </HStack>
              </VStack>
            )}
          </VStack>
        </HStack>

        {errorMessage && (
          <Text size="sm" className="text-danger">
            {errorMessage}
          </Text>
        )}
      </div>
    </VStack>
  );
}

interface IconLibraryPickerProps {
  value: string;
  onSelect: (value: string) => void;
  cardName?: string;
  sourceUrl?: string;
  disabled?: boolean;
}

function IconLibraryPicker({
  value,
  onSelect,
  cardName,
  sourceUrl,
  disabled = false,
}: IconLibraryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { icons, isLoading, loadError, load } = useLibraryCatalog();

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const normalizedQuery = query.trim().toLowerCase();
  const recommendations = useMemo(
    () => getIconRecommendations(icons ?? [], cardName, sourceUrl, 10),
    [cardName, icons, sourceUrl],
  );
  const filteredIcons = useMemo(() => {
    if (!icons) return [];

    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    if (terms.length === 0) return icons;

    return icons.filter((icon) => {
      const haystack = `${icon.name} ${icon.label}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [icons, normalizedQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredIcons.length / ICON_PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const pageIcons = useMemo(
    () =>
      filteredIcons.slice(
        (safePage - 1) * ICON_PAGE_SIZE,
        safePage * ICON_PAGE_SIZE,
      ),
    [filteredIcons, safePage],
  );

  useEffect(() => {
    if (!isOpen || !icons) return;

    const selectedIndex = icons.findIndex((icon) => icon.url === value);
    if (selectedIndex >= 0) {
      setCurrentPage(Math.floor(selectedIndex / ICON_PAGE_SIZE) + 1);
    }
  }, [icons, isOpen, value]);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage === safePage) return;
    setCurrentPage(nextPage);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const handleSelect = (item: LibraryItem) => {
    if (disabled) return;
    onSelect(item.url);
    setIsOpen(false);
  };

  const iconButtonClassName = (isSelected: boolean) =>
    `relative flex flex-col items-center justify-center rounded-control border p-1.5 transition-colors ${
      isSelected
        ? 'border-accent bg-accent/10 text-accent'
        : 'border-transparent hover:border-border hover:bg-overlay-hover'
    }`;

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      label="选择卡片图标"
      width={340}
      placement="below"
      content={
        <VStack gap={2} className="w-[320px] p-3">
          <Text size="sm" weight="medium">
            图标库
          </Text>
          <TextInput
            label="搜索图标"
            isLabelHidden
            placeholder="搜索服务名…"
            value={query}
            onChange={(next) => {
              setQuery(next);
              setCurrentPage(1);
              scrollRef.current?.scrollTo({ top: 0 });
            }}
            width="100%"
            startIcon={<Search size={14} />}
            isDisabled={disabled}
          />

          <div
            ref={scrollRef}
            aria-busy={isLoading}
            className="-mx-1 max-h-[280px] overflow-y-auto px-1"
          >
            {!query && recommendations.length > 0 && (
              <VStack gap={1} className="mb-2 border-b border-border pb-2">
                <Text size="2xs" color="secondary">
                  根据名称 / 地址推荐
                </Text>
                <div className="grid grid-cols-5 gap-1.5">
                  {recommendations.map((item) => {
                    const isSelected = item.url === value;
                    return (
                      <button
                        key={`recommended-${item.name}`}
                        type="button"
                        onClick={() => handleSelect(item)}
                        title={`推荐：${item.label}`}
                        aria-pressed={isSelected}
                        disabled={disabled}
                        className={iconButtonClassName(isSelected)}
                      >
                        <Image
                          src={item.url}
                          alt=""
                          width={28}
                          height={28}
                          loading="eager"
                          decoding="async"
                          unoptimized
                          className="size-7 object-contain"
                        />
                        <Text
                          size="2xs"
                          color="secondary"
                          className="mt-1 w-full truncate text-center"
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Check
                            aria-hidden
                            className="absolute right-0.5 top-0.5 size-3 text-accent"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </VStack>
            )}

            {!icons ? (
              <VStack gap={2} className="items-center py-6">
                <Text size="sm" color="secondary" className="text-center">
                  {loadError ?? '图标索引加载中…'}
                </Text>
                {loadError && (
                  <Button
                    label="重试"
                    variant="ghost"
                    size="sm"
                    isDisabled={disabled}
                    onClick={() => void load()}
                  />
                )}
              </VStack>
            ) : filteredIcons.length === 0 ? (
              <Text size="sm" color="secondary" className="py-4 text-center">
                未找到匹配的图标
              </Text>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {pageIcons.map((item) => {
                  const isSelected = item.url === value;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSelect(item)}
                      title={item.label}
                      aria-pressed={isSelected}
                      disabled={disabled}
                      className={iconButtonClassName(isSelected)}
                    >
                      <Image
                        src={item.url}
                        alt=""
                        width={28}
                        height={28}
                        loading="eager"
                        decoding="async"
                        unoptimized
                        className="size-7 object-contain"
                      />
                      <Text
                        size="2xs"
                        color="secondary"
                        className="mt-1 w-full truncate text-center"
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <Check
                          aria-hidden
                          className="absolute right-0.5 top-0.5 size-3 text-accent"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <HStack justify="between" align="center">
            <Text size="2xs" color="secondary">
              共 {filteredIcons.length} 个
            </Text>
            <HStack gap={1} align="center" vAlign="center">
              <IconButton
                label="上一页"
                tooltip="上一页"
                variant="ghost"
                size="sm"
                icon={<ChevronLeft size={16} />}
                isDisabled={disabled || safePage <= 1}
                onClick={() => goToPage(safePage - 1)}
              />
              <Text size="2xs" color="secondary">
                {safePage} / {totalPages}
              </Text>
              <IconButton
                label="下一页"
                tooltip="下一页"
                variant="ghost"
                size="sm"
                icon={<ChevronRight size={16} />}
                isDisabled={disabled || safePage >= totalPages}
                onClick={() => goToPage(safePage + 1)}
              />
            </HStack>
          </HStack>
        </VStack>
      }
    >
      <IconButton
        label="图标库"
        tooltip="图标库"
        variant="ghost"
        size="sm"
        icon={<Library size={16} />}
        isDisabled={disabled}
      />
    </Popover>
  );
}
