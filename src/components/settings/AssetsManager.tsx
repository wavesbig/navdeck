'use client';

import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Button } from '@astryxdesign/core/Button';
import {
  ContextMenu,
  type ContextMenuOption,
} from '@astryxdesign/core/ContextMenu';
import {
  DropdownMenu,
  type DropdownMenuOption,
} from '@astryxdesign/core/DropdownMenu';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Section } from '@astryxdesign/core/Section';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { Toolbar } from '@astryxdesign/core/Toolbar';
import { VStack } from '@astryxdesign/core/VStack';
import {
  ArrowUpDown,
  Check,
  ImagePlus,
  LayoutGrid,
  List,
  Search,
  Shapes,
  Trash2,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { iconsApi, wallpapersApi } from '@/services';
import type { Wallpaper } from '@/types';

export interface UploadedIcon {
  path: string;
  name: string;
  scope: 'cards' | 'library';
  size?: number;
  mtime?: string;
}

interface PendingDelete {
  kind: 'icon' | 'image';
  key: string;
  name: string;
}

interface BulkDeleteState {
  kind: 'icon' | 'image';
  keys: string[];
  names: string[];
  totalUsage: number;
}

interface AssetsManagerProps {
  icons: UploadedIcon[];
  wallpapers: Wallpaper[];
  appliedWallpaperId?: string | null;
  iconUsage?: Record<string, number>;
}

type ViewMode = 'grid' | 'list';
type SortKey = 'name' | 'mtime';
type TabKey = 'icon' | 'wallpaper';

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sortAssets<T extends { name: string; mtime?: string }>(
  items: T[],
  key: SortKey,
): T[] {
  const arr = [...items];
  if (key === 'name')
    arr.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  else
    arr.sort((a, b) => {
      const ta = a.mtime ? new Date(a.mtime).getTime() : 0;
      const tb = b.mtime ? new Date(b.mtime).getTime() : 0;
      return tb - ta;
    });
  return arr;
}

function filterByQuery<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => it.name.toLowerCase().includes(q));
}

function getItemKey(item: { id?: string; path?: string }): string {
  return item.path ?? item.id ?? '';
}

/**
 * 素材管理器
 *
 * 单条工具栏承载全部操作：类型切换（SegmentedControl）+ 搜索 + 排序 + 视图切换；
 * 选中素材后工具栏整体切换为批量操作栏。图标等比居中预览（不裁切），
 * 壁纸使用 16:9 缩略图。
 */
export function AssetsManager({
  icons,
  wallpapers,
  appliedWallpaperId,
  iconUsage = {},
}: AssetsManagerProps) {
  const router = useRouter();
  const isCompact = useMediaQuery('(max-width: 640px)');
  const showToast = useToast();
  const [tab, setTab] = useState<TabKey>('icon');

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  const [selectedIcons, setSelectedIcons] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [selectedWps, setSelectedWps] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [bulkDelete, setBulkDelete] = useState<BulkDeleteState | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortKey>('name');

  const iconUpload = useFileUpload({
    accept:
      'image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon',
    onFile: async (file) => {
      await iconsApi.upload(file, 'library');
      router.refresh();
    },
  });
  const imageUpload = useFileUpload({
    accept: 'image/png,image/jpeg,image/webp',
    onFile: async (file) => {
      await wallpapersApi.upload(file);
      router.refresh();
    },
  });

  const visibleIcons = useMemo(
    () => sortAssets(filterByQuery(icons, query), sort),
    [icons, query, sort],
  );
  const visibleWallpapers = useMemo(
    () => sortAssets(filterByQuery(wallpapers, query), sort),
    [wallpapers, query, sort],
  );

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { kind, key } = pendingDelete;
    setDeleting(key);
    try {
      if (kind === 'icon') await iconsApi.delete(key);
      else await wallpapersApi.delete(key);
      setPendingDelete(null);
      router.refresh();
    } catch (e) {
      showToast({
        body: e instanceof Error ? e.message : '删除失败',
        type: 'error',
      });
      setPendingDelete(null);
    } finally {
      setDeleting(null);
    }
  };

  const confirmBulkDelete = async () => {
    if (!bulkDelete) return;
    setBulkDeleting(true);
    const errors: string[] = [];
    for (const key of bulkDelete.keys) {
      try {
        if (bulkDelete.kind === 'icon') await iconsApi.delete(key);
        else await wallpapersApi.delete(key);
      } catch (e) {
        errors.push(`${key}: ${e instanceof Error ? e.message : '删除失败'}`);
      }
    }
    if (bulkDelete.kind === 'icon') setSelectedIcons(new Set());
    else setSelectedWps(new Set());
    setBulkDelete(null);
    setBulkDeleting(false);
    if (errors.length > 0) {
      showToast({
        body: `${errors.length} 项删除失败：${errors.slice(0, 3).join('；')}`,
        type: 'error',
      });
    }
    router.refresh();
  };

  const pendingUsage = pendingDelete ? (iconUsage[pendingDelete.key] ?? 0) : 0;
  const singleDeleteDescription =
    pendingDelete?.kind === 'icon' && pendingUsage > 0
      ? `${pendingUsage} 张卡片正在使用「${pendingDelete.name}」，删除后这些卡片的图标将回退为首字母显示。此操作无法撤销。`
      : `删除「${pendingDelete?.name}」后无法恢复。`;

  const isIconTab = tab === 'icon';
  const currentItems = isIconTab ? visibleIcons : visibleWallpapers;
  const currentTotal = isIconTab ? icons.length : wallpapers.length;
  const currentSelection = isIconTab ? selectedIcons : selectedWps;
  const setCurrentSelection = isIconTab ? setSelectedIcons : setSelectedWps;
  const hasSelection = currentSelection.size > 0;
  const noMatch = currentItems.length === 0 && query.trim().length > 0;
  const isEmpty = !noMatch && currentItems.length === 0;

  const toggleSelection = (key: string) => {
    setCurrentSelection((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllCurrent = () => {
    if (isIconTab) {
      setSelectedIcons(
        new Set(
          visibleIcons.flatMap((i) =>
            iconUsage[i.path] === undefined || iconUsage[i.path] === 0
              ? [i.path]
              : [],
          ),
        ),
      );
    } else {
      setSelectedWps(
        new Set(
          visibleWallpapers.flatMap((w) =>
            w.id !== appliedWallpaperId ? [w.id] : [],
          ),
        ),
      );
    }
  };

  const allSelected =
    currentItems.length > 0 && currentSelection.size === currentItems.length;

  const triggerBulkDelete = () => {
    const keys = Array.from(currentSelection);
    const names = currentItems.flatMap((it) =>
      currentSelection.has(getItemKey(it)) ? [it.name] : [],
    );
    const totalUsage = isIconTab
      ? keys.reduce((sum, k) => sum + (iconUsage[k] ?? 0), 0)
      : 0;
    setBulkDelete({
      kind: isIconTab ? 'icon' : 'image',
      keys,
      names,
      totalUsage,
    });
  };

  const sortItems = useMemo<DropdownMenuOption[]>(
    () => [
      {
        id: 'name',
        label: '按名称',
        icon: sort === 'name' ? <Check size={14} /> : undefined,
        onClick: () => setSort('name'),
      },
      {
        id: 'mtime',
        label: '按修改时间',
        icon: sort === 'mtime' ? <Check size={14} /> : undefined,
        onClick: () => setSort('mtime'),
      },
    ],
    [sort],
  );

  const uploadItems = useMemo<DropdownMenuOption[]>(
    () => [
      {
        id: 'icon',
        label: '上传图标',
        icon: <Shapes size={14} />,
        onClick: () => iconUpload.open(),
      },
      {
        id: 'wallpaper',
        label: '上传壁纸',
        icon: <ImagePlus size={14} />,
        onClick: () => imageUpload.open(),
      },
    ],
    [iconUpload, imageUpload],
  );

  const uploading = iconUpload.uploading || imageUpload.uploading;

  const typeControl = (
    <SegmentedControl
      value={tab}
      onChange={(v) => setTab(v as TabKey)}
      label="素材类型"
      layout="fill"
    >
      <SegmentedControlItem
        value="icon"
        label={`图标 ${icons.length}`}
        icon={<Shapes size={14} />}
      />
      <SegmentedControlItem
        value="wallpaper"
        label={`壁纸 ${wallpapers.length}`}
        icon={<ImagePlus size={14} />}
      />
    </SegmentedControl>
  );

  const searchInput = (
    <TextInput
      label="搜索文件名"
      isLabelHidden
      value={query}
      onChange={setQuery}
      placeholder="搜索文件名"
      startIcon={Search}
      hasClear
      width={isCompact ? '100%' : 220}
    />
  );

  const sortMenu = (
    <DropdownMenu
      button={{
        label: '排序',
        icon: <ArrowUpDown size={14} />,
        variant: 'ghost',
      }}
      items={sortItems}
      menuWidth={140}
      hasChevron={false}
    />
  );

  const viewButton = (
    <IconButton
      label={view === 'grid' ? '切换到列表' : '切换到网格'}
      tooltip={view === 'grid' ? '切换到列表' : '切换到网格'}
      icon={view === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
      variant="ghost"
      onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
    />
  );

  return (
    <Section variant="transparent" padding={0}>
      <VStack gap={5}>
        {/* 页面标题 + 上传入口 */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <VStack gap={1}>
            <Heading level={2}>素材管理</Heading>
            <Text size="sm" color="secondary">
              已上传的卡片图标与壁纸文件
            </Text>
          </VStack>
          <DropdownMenu
            button={{
              label: uploading ? '上传中…' : '上传',
              icon: <Upload size={14} />,
              variant: 'primary',
              size: 'sm',
            }}
            items={uploadItems}
            menuWidth={160}
          />
        </div>

        {/* 主工具栏常驻；批量操作独立出现，避免筛选上下文被替换 */}
        <Toolbar
          label="素材筛选与视图"
          size="sm"
          variant="muted"
          dividers={['bottom']}
          startContent={
            isCompact ? (
              <VStack gap={2} width="100%">
                <HStack width="100%" vAlign="center">
                  {typeControl}
                </HStack>
                {searchInput}
                <HStack gap={2} justify="between" width="100%" vAlign="center">
                  {sortMenu}
                  {viewButton}
                </HStack>
              </VStack>
            ) : (
              <HStack
                gap={2}
                wrap="wrap"
                hAlign="between"
                vAlign="center"
                width="100%"
              >
                <HStack width={176} vAlign="center">
                  {typeControl}
                </HStack>
                <HStack gap={2} wrap="wrap" justify="end" vAlign="center">
                  {searchInput}
                  {sortMenu}
                  {viewButton}
                </HStack>
              </HStack>
            )
          }
        />

        {hasSelection && (
          <Toolbar
            label="批量操作"
            size="sm"
            variant="muted"
            startContent={
              isCompact ? (
                <VStack gap={2} width="100%">
                  <Text size="sm" weight="medium" color="accent">
                    已选 {currentSelection.size} 项
                  </Text>
                  <HStack
                    gap={2}
                    justify="between"
                    width="100%"
                    vAlign="center"
                  >
                    <Button
                      label={allSelected ? '取消选择' : '全选'}
                      variant="ghost"
                      onClick={
                        allSelected
                          ? () => setCurrentSelection(new Set())
                          : selectAllCurrent
                      }
                    />
                    <Button
                      label="清空"
                      variant="ghost"
                      onClick={() => setCurrentSelection(new Set())}
                    />
                  </HStack>
                  <Button
                    label={`删除 ${currentSelection.size} 项`}
                    variant="destructive"
                    icon={<Trash2 size={14} />}
                    width="100%"
                    onClick={triggerBulkDelete}
                  />
                </VStack>
              ) : (
                <HStack
                  gap={2}
                  wrap="wrap"
                  hAlign="between"
                  vAlign="center"
                  width="100%"
                >
                  <HStack gap={2} wrap="wrap" vAlign="center">
                    <Text size="sm" weight="medium" color="accent">
                      已选 {currentSelection.size} 项
                    </Text>
                    <Button
                      label={allSelected ? '取消选择' : '全选'}
                      variant="ghost"
                      onClick={
                        allSelected
                          ? () => setCurrentSelection(new Set())
                          : selectAllCurrent
                      }
                    />
                    <Button
                      label="清空"
                      variant="ghost"
                      onClick={() => setCurrentSelection(new Set())}
                    />
                  </HStack>
                  <Button
                    label={`删除 ${currentSelection.size} 项`}
                    variant="destructive"
                    icon={<Trash2 size={14} />}
                    onClick={triggerBulkDelete}
                  />
                </HStack>
              )
            }
          />
        )}

        {/* 搜索匹配统计（仅搜索时显示） */}
        {query.trim().length > 0 && !isEmpty && (
          <Text size="xsm" color="secondary" className="font-mono">
            匹配 {currentItems.length} / {currentTotal} 项
          </Text>
        )}

        {isEmpty ? (
          <EmptyState
            icon={isIconTab ? <Shapes size={16} /> : <ImagePlus size={16} />}
            label={isIconTab ? '还没有上传的图标' : '还没有上传的壁纸'}
            hint={
              isIconTab
                ? '支持 PNG / SVG / WebP / GIF / ICO'
                : '支持 PNG / JPEG / WebP'
            }
            onUpload={() =>
              isIconTab ? iconUpload.open() : imageUpload.open()
            }
            uploading={uploading}
          />
        ) : noMatch ? (
          <Text size="sm" color="secondary" className="py-10 text-center">
            没有匹配「{query}」的内容
          </Text>
        ) : view === 'grid' ? (
          <GridContent
            isIconTab={isIconTab}
            items={currentItems}
            selectedIcons={selectedIcons}
            selectedWps={selectedWps}
            appliedWallpaperId={appliedWallpaperId}
            iconUsage={iconUsage}
            deleting={deleting}
            onToggleIcon={(p) => toggleSelection(p)}
            onToggleWp={(id) => toggleSelection(id)}
            onDeleteIcon={(p, n) =>
              setPendingDelete({ kind: 'icon', key: p, name: n })
            }
            onDeleteWp={(id, n) =>
              setPendingDelete({ kind: 'image', key: id, name: n })
            }
          />
        ) : (
          <ListContent
            isIconTab={isIconTab}
            items={currentItems}
            selectedIcons={selectedIcons}
            selectedWps={selectedWps}
            appliedWallpaperId={appliedWallpaperId}
            iconUsage={iconUsage}
            deleting={deleting}
            onToggleIcon={(p) => toggleSelection(p)}
            onToggleWp={(id) => toggleSelection(id)}
            onDeleteIcon={(p, n) =>
              setPendingDelete({ kind: 'icon', key: p, name: n })
            }
            onDeleteWp={(id, n) =>
              setPendingDelete({ kind: 'image', key: id, name: n })
            }
          />
        )}

        {iconUpload.input}
        {imageUpload.input}

        <AlertDialog
          isOpen={pendingDelete !== null}
          onOpenChange={(o) => {
            if (!o && deleting === null) setPendingDelete(null);
          }}
          title={pendingDelete?.kind === 'icon' ? '删除图标' : '删除图片'}
          description={singleDeleteDescription}
          actionLabel="删除"
          cancelLabel="取消"
          isActionLoading={deleting !== null}
          onAction={() => void confirmDelete()}
        />

        <AlertDialog
          isOpen={bulkDelete !== null}
          onOpenChange={(o) => {
            if (!o && !bulkDeleting) setBulkDelete(null);
          }}
          title={`批量删除${bulkDelete?.kind === 'icon' ? '图标' : '图片'}`}
          description={bulkDeleteDescription(bulkDelete)}
          actionLabel={
            bulkDelete ? `删除 ${bulkDelete.keys.length} 项` : '删除'
          }
          cancelLabel="取消"
          isActionLoading={bulkDeleting}
          onAction={() => void confirmBulkDelete()}
        />
      </VStack>
    </Section>
  );
}

interface ContentProps {
  isIconTab: boolean;
  items: ReadonlyArray<UploadedIcon | Wallpaper>;
  selectedIcons: ReadonlySet<string>;
  selectedWps: ReadonlySet<string>;
  appliedWallpaperId?: string | null;
  iconUsage: Record<string, number>;
  deleting: string | null;
  onToggleIcon: (path: string) => void;
  onToggleWp: (id: string) => void;
  onDeleteIcon: (path: string, name: string) => void;
  onDeleteWp: (id: string, name: string) => void;
}

function GridContent({
  isIconTab,
  items,
  selectedIcons,
  selectedWps,
  appliedWallpaperId,
  iconUsage,
  deleting,
  onToggleIcon,
  onToggleWp,
  onDeleteIcon,
  onDeleteWp,
}: ContentProps) {
  return (
    <Grid
      columns={{ minWidth: isIconTab ? 112 : 220, repeat: 'fill' }}
      gap={isIconTab ? 2 : 3}
    >
      {items.map((item) => {
        if (isIconTab) {
          const icon = item as UploadedIcon;
          return (
            <AssetCard
              key={icon.path}
              variant="icon"
              selected={selectedIcons.has(icon.path)}
              onToggle={() => onToggleIcon(icon.path)}
              onDelete={() => onDeleteIcon(icon.path, icon.name)}
              deleting={deleting === icon.path}
              src={`/api/icons/file?path=${icon.path}`}
              name={icon.name}
              size={icon.size}
              mtime={icon.mtime}
              usageCount={iconUsage[icon.path] ?? 0}
            />
          );
        }
        const wp = item as Wallpaper;
        const inUse = wp.id === appliedWallpaperId;
        return (
          <AssetCard
            key={wp.id}
            variant="wallpaper"
            selected={selectedWps.has(wp.id)}
            onToggle={inUse ? undefined : () => onToggleWp(wp.id)}
            onDelete={inUse ? undefined : () => onDeleteWp(wp.id, wp.name)}
            deleting={deleting === wp.id}
            src={wp.thumbnail ?? wp.path}
            name={wp.name}
            size={wp.size}
            mtime={wp.createdAt}
            locked={inUse}
            lockedLabel="使用中"
          />
        );
      })}
    </Grid>
  );
}

function ListContent({
  isIconTab,
  items,
  selectedIcons,
  selectedWps,
  appliedWallpaperId,
  iconUsage,
  deleting,
  onToggleIcon,
  onToggleWp,
  onDeleteIcon,
  onDeleteWp,
}: ContentProps) {
  return (
    <div className="rounded-control border border-border/60 bg-surface overflow-hidden divide-y divide-border/40">
      <div className="grid grid-cols-[20px_32px_minmax(0,1fr)_88px_64px_24px] items-center gap-3 px-2 py-1.5 bg-surface-2/40 text-2xs uppercase tracking-wide text-fg-secondary">
        <span />
        <span />
        <span>名称</span>
        <span>修改时间</span>
        <span className="text-right">大小</span>
        <span />
      </div>
      {items.map((item) => {
        if (isIconTab) {
          const icon = item as UploadedIcon;
          return (
            <AssetRow
              key={icon.path}
              variant="icon"
              selected={selectedIcons.has(icon.path)}
              onToggle={() => onToggleIcon(icon.path)}
              onDelete={() => onDeleteIcon(icon.path, icon.name)}
              deleting={deleting === icon.path}
              src={`/api/icons/file?path=${icon.path}`}
              name={icon.name}
              size={icon.size}
              mtime={icon.mtime}
              usageCount={iconUsage[icon.path] ?? 0}
            />
          );
        }
        const wp = item as Wallpaper;
        const inUse = wp.id === appliedWallpaperId;
        return (
          <AssetRow
            key={wp.id}
            variant="wallpaper"
            selected={selectedWps.has(wp.id)}
            onToggle={inUse ? undefined : () => onToggleWp(wp.id)}
            onDelete={inUse ? undefined : () => onDeleteWp(wp.id, wp.name)}
            deleting={deleting === wp.id}
            src={wp.thumbnail ?? wp.path}
            name={wp.name}
            size={wp.size}
            mtime={wp.createdAt}
            locked={inUse}
            lockedLabel="使用中"
          />
        );
      })}
    </div>
  );
}

/* ---------- 网格卡片 ---------- */

interface AssetItemProps {
  variant: 'icon' | 'wallpaper';
  selected: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  src: string;
  name: string;
  size?: number;
  mtime?: string;
  usageCount?: number;
  locked?: boolean;
  lockedLabel?: string;
}

function AssetCard({
  variant,
  selected,
  onToggle,
  onDelete,
  deleting = false,
  src,
  name,
  size,
  mtime,
  usageCount = 0,
  locked = false,
  lockedLabel,
}: AssetItemProps) {
  const interactive = !locked && onToggle !== undefined;

  const menuItems = useMemo<ContextMenuOption[]>(() => {
    const items: ContextMenuOption[] = [
      {
        id: 'meta',
        label: `${formatSize(size)} · ${formatDate(mtime)}`,
        isDisabled: true,
      },
    ];
    if (interactive)
      items.push({
        id: 'toggle',
        label: selected ? '取消选择' : '选择',
        onClick: () => onToggle?.(),
      });
    if (onDelete && !locked) {
      items.push({ type: 'divider' });
      items.push({
        id: 'delete',
        label: '删除',
        icon: <Trash2 size={14} />,
        variant: 'destructive',
        onClick: () => onDelete(),
      });
    }
    return items;
  }, [interactive, onDelete, onToggle, selected, locked, size, mtime]);

  return (
    <ContextMenu items={menuItems} menuWidth={180}>
      <SelectableCard
        label={`${name}（素材）`}
        isSelected={selected}
        isDisabled={!interactive}
        onChange={() => onToggle?.()}
        padding={0}
        className="group"
      >
        {/* 预览区：图标等比居中不裁切，壁纸 16:9 封面 */}
        <AspectRatio ratio={variant === 'icon' ? 1 : 16 / 9}>
          <div className="relative h-full w-full overflow-hidden bg-surface-2">
            <Image
              src={src}
              alt={name}
              fill
              sizes={variant === 'icon' ? '160px' : '320px'}
              unoptimized
              loading="lazy"
              className={
                variant === 'icon' ? 'object-contain p-5' : 'object-cover'
              }
            />
            {onDelete && !locked && (
              <IconButton
                label={`删除 ${name}`}
                tooltip={`删除 ${name}`}
                variant="ghost"
                icon={<Trash2 size={12} />}
                isLoading={deleting}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={`!absolute !top-1 !right-1 !bg-surface/80 !backdrop-blur-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ${
                  selected ? 'opacity-100' : ''
                }`}
              />
            )}
            {locked && lockedLabel && (
              <Text
                size="2xs"
                color="secondary"
                className="absolute left-1.5 top-1.5 rounded-sm bg-surface/80 px-1 py-0.5 font-mono backdrop-blur-sm"
              >
                {lockedLabel}
              </Text>
            )}
          </div>
        </AspectRatio>
        <HStack
          gap={1.5}
          paddingInline={2}
          paddingBlock={1.5}
          vAlign="center"
          justify="between"
        >
          <Text size="xsm" className="min-w-0 flex-1 truncate">
            {name}
          </Text>
          <Text
            size="2xs"
            color="secondary"
            className="shrink-0 font-mono tabular-nums"
          >
            {usageCount > 0 ? `×${usageCount}` : formatSize(size)}
          </Text>
        </HStack>
      </SelectableCard>
    </ContextMenu>
  );
}

/* ---------- 列表行 ---------- */

function AssetRow({
  variant,
  selected,
  onToggle,
  onDelete,
  deleting = false,
  src,
  name,
  size,
  mtime,
  usageCount = 0,
  locked = false,
  lockedLabel,
}: AssetItemProps) {
  const interactive = !locked && onToggle !== undefined;
  const handleActivate = () => {
    if (interactive) onToggle?.();
  };

  const menuItems = useMemo<ContextMenuOption[]>(() => {
    const items: ContextMenuOption[] = [];
    if (interactive)
      items.push({
        id: 'toggle',
        label: selected ? '取消选择' : '选择',
        onClick: () => onToggle?.(),
      });
    if (onDelete && !locked) {
      items.push({ type: 'divider' });
      items.push({
        id: 'delete',
        label: '删除',
        icon: <Trash2 size={14} />,
        variant: 'destructive',
        onClick: () => onDelete(),
      });
    }
    return items;
  }, [interactive, onDelete, onToggle, selected, locked]);

  return (
    <ContextMenu items={menuItems} menuWidth={160}>
      {/* biome-ignore lint/a11y/useSemanticElements: 行内含 checkbox / 删除 button */}
      <div
        role="button"
        tabIndex={interactive ? 0 : -1}
        aria-pressed={selected}
        aria-disabled={!interactive}
        aria-label={`${name}（素材）`}
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest('button, input')) return;
          handleActivate();
        }}
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
          }
        }}
        className={`group relative grid grid-cols-[20px_32px_minmax(0,1fr)_88px_64px_24px] items-center gap-3 px-2 py-1.5 cursor-pointer ${
          selected ? 'bg-accent/5' : 'hover:bg-surface-2/40'
        } ${deleting ? 'opacity-40' : ''} ${locked ? 'opacity-60' : ''}`}
      >
        <input
          type="checkbox"
          checked={selected}
          disabled={locked}
          onChange={() => onToggle?.()}
          aria-label={`选择 ${name}`}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 rounded-sm border-border bg-transparent accent-accent cursor-pointer checked:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-control bg-surface-2">
          {variant === 'icon' ? (
            <Image
              src={src}
              alt=""
              width={20}
              height={20}
              unoptimized
              className="h-5 w-5 object-contain"
            />
          ) : (
            <Image
              src={src}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm" title={name}>
            {name}
          </span>
          {usageCount > 0 && !locked && (
            <span className="shrink-0 text-2xs font-mono text-fg-secondary">
              ×{usageCount}
            </span>
          )}
          {locked && lockedLabel && (
            <span className="shrink-0 text-2xs font-mono text-fg-secondary">
              {lockedLabel}
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-fg-secondary tabular-nums">
          {formatDate(mtime)}
        </span>
        <span className="text-right text-xs font-mono text-fg-secondary tabular-nums">
          {formatSize(size)}
        </span>
        <div className="flex justify-end">
          {onDelete && !locked ? (
            <IconButton
              label={`删除 ${name}`}
              tooltip={`删除 ${name}`}
              variant="ghost"
              size="sm"
              icon={<Trash2 size={12} />}
              isLoading={deleting}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ${
                selected ? 'opacity-100' : ''
              }`}
            />
          ) : (
            <span />
          )}
        </div>
      </div>
    </ContextMenu>
  );
}

/* ---------- 空态 / 错误 ---------- */

interface EmptyStateProps {
  icon: ReactNode;
  label: string;
  hint: string;
  onUpload: () => void;
  uploading: boolean;
}

function EmptyState({
  icon,
  label,
  hint,
  onUpload,
  uploading,
}: EmptyStateProps) {
  return (
    <button
      type="button"
      onClick={onUpload}
      disabled={uploading}
      className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-2/40 px-4 py-12 hover:border-accent/60 hover:bg-surface-2/80 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
        {icon}
      </div>
      <Text size="sm" weight="medium">
        {label}
      </Text>
      <Text size="2xs" color="secondary">
        点击上传，{hint}
      </Text>
    </button>
  );
}

function bulkDeleteDescription(state: BulkDeleteState | null): string {
  if (!state) return '';
  const { kind, keys, names, totalUsage } = state;
  const head = names.slice(0, 3).join('、');
  const tail = names.length > 3 ? ` 等 ${names.length} 项` : '';
  if (kind === 'icon' && totalUsage > 0) {
    return `共 ${keys.length} 项（含「${head}」${tail}）。其中 ${totalUsage} 处引用会在删除后回退为首字母显示。此操作无法撤销。`;
  }
  return `共 ${keys.length} 项（含「${head}」${tail}）。此操作无法撤销。`;
}
