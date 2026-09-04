'use client';

import { useToast } from '@astryxdesign/core/Toast';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { iconsApi, wallpapersApi } from '@/services';
import type { Wallpaper } from '@/types';
import {
  type BulkDeleteState,
  filterByQuery,
  getItemKey,
  type PendingDelete,
  type SortKey,
  sortAssets,
  type TabKey,
  type UploadedIcon,
  type ViewMode,
} from './assets-shared';

interface UseAssetsControllerArgs {
  icons: UploadedIcon[];
  wallpapers: Wallpaper[];
  appliedWallpaperId?: string | null;
  iconUsage: Record<string, number>;
}

/**
 * 素材管理控制器：集中承载筛选 / 选择 / 删除的全部状态与处理逻辑，
 * 让 AssetsManager 组件退化为纯展示组合层。
 */
export function useAssetsController({
  icons,
  wallpapers,
  appliedWallpaperId,
  iconUsage,
}: UseAssetsControllerArgs) {
  const router = useRouter();
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
  const currentItems: (UploadedIcon | Wallpaper)[] = isIconTab
    ? visibleIcons
    : visibleWallpapers;
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

  return {
    tab,
    setTab,
    query,
    setQuery,
    view,
    setView,
    sort,
    setSort,
    isIconTab,
    uploading: iconUpload.uploading || imageUpload.uploading,
    iconUpload,
    imageUpload,
    visibleIcons,
    visibleWallpapers,
    currentItems,
    currentTotal,
    currentSelection,
    setCurrentSelection,
    hasSelection,
    noMatch,
    isEmpty,
    allSelected,
    pendingDelete,
    setPendingDelete,
    deleting,
    bulkDelete,
    setBulkDelete,
    bulkDeleting,
    singleDeleteDescription,
    toggleSelection,
    selectAllCurrent,
    triggerBulkDelete,
    confirmDelete,
    confirmBulkDelete,
  };
}
