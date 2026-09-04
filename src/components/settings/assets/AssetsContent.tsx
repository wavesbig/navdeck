'use client';

import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import {
  ContextMenu,
  type ContextMenuOption,
} from '@astryxdesign/core/ContextMenu';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { Text } from '@astryxdesign/core/Text';
import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { Wallpaper } from '@/types';
import { formatDate, formatSize, type UploadedIcon } from './assets-shared';

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

export function GridContent({
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

export function ListContent({
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

export function EmptyState({
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
