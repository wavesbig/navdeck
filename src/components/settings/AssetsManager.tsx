'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useRef, useState } from 'react';
import { iconsApi, wallpapersApi } from '@/services';
import type { Wallpaper } from '@/types';

export interface UploadedIcon {
  path: string;
  name: string;
  scope: 'cards' | 'library';
}

interface AssetsManagerProps {
  icons: UploadedIcon[];
  wallpapers: Wallpaper[];
}

type Tab = 'icons' | 'images';

/**
 * 素材管理（Linear / Vercel 风格）
 *
 * 交互：
 * - Tab + 上传按钮并排（操作行）
 * - hover tile 显示半透明遮罩 + 中间删除按钮
 * - 点击删除直接调用 API（无确认 overlay）
 * - tile 有 transition 过渡
 */
export function AssetsManager({ icons, wallpapers }: AssetsManagerProps) {
  const [tab, setTab] = useState<Tab>('icons');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      if (tab === 'icons') {
        await iconsApi.upload(file, 'library');
      } else {
        await wallpapersApi.upload(file);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (key: string) => {
    setDeleting(key);
    setError(null);
    try {
      if (tab === 'icons') {
        await iconsApi.delete(key);
      } else {
        await wallpapersApi.delete(key);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card padding={5} variant="default">
      <VStack gap={5}>
        {/* Section header */}
        <VStack gap={1}>
          <Heading level={5}>素材</Heading>
          <Text size="sm" color="secondary">
            管理自定义图标和壁纸图片
          </Text>
        </VStack>

        <Divider />

        {/* 操作行：Tab + 上传按钮并排 */}
        <HStack justify="between" align="center">
          <SegmentedControl
            label="素材类型"
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            size="sm"
          >
            <SegmentedControlItem
              value="icons"
              label={`图标 (${icons.length})`}
            />
            <SegmentedControlItem
              value="images"
              label={`图片 (${wallpapers.length})`}
            />
          </SegmentedControl>

          <input
            ref={fileInputRef}
            type="file"
            accept={
              tab === 'icons'
                ? 'image/png,image/jpeg,image/svg+xml,image/webp,image/gif,image/x-icon'
                : 'image/png,image/jpeg,image/webp'
            }
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            label={uploading ? '上传中...' : '上传'}
            variant="primary"
            size="sm"
            icon={<Upload size={14} />}
            isDisabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          />
        </HStack>

        {/* 内容区 */}
        {tab === 'icons' ? (
          icons.length === 0 ? (
            <EmptyState
              label="还没有上传的图标"
              onUpload={() => fileInputRef.current?.click()}
              uploading={uploading}
            />
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {icons.map((icon) => (
                <AssetTile
                  key={icon.path}
                  src={`/api/icons/file?path=${icon.path}`}
                  name={icon.name}
                  onDelete={() => handleDelete(icon.path)}
                  deleting={deleting === icon.path}
                />
              ))}
            </div>
          )
        ) : wallpapers.length === 0 ? (
          <EmptyState
            label="还没有上传的图片"
            onUpload={() => fileInputRef.current?.click()}
            uploading={uploading}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {wallpapers.map((wp) => (
              <AssetTile
                key={wp.id}
                src={wp.path}
                name={wp.name}
                onDelete={() => handleDelete(wp.id)}
                deleting={deleting === wp.id}
                aspect="video"
              />
            ))}
          </div>
        )}

        {error && (
          <Text size="sm" className="text-danger" role="alert">
            {error}
          </Text>
        )}
      </VStack>
    </Card>
  );
}

function EmptyState({
  label,
  onUpload,
  uploading,
}: {
  label: string;
  onUpload: () => void;
  uploading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onUpload}
      disabled={uploading}
      className="w-full rounded-lg border border-dashed border-border py-12 px-4 flex flex-col items-center justify-center gap-3 transition-colors hover:border-accent hover:bg-accent/5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
        <ImagePlus size={18} className="text-accent" />
      </div>
      <VStack gap={1}>
        <Text size="sm" weight="medium">
          {label}
        </Text>
        <Text size="2xs" color="secondary">
          点击上传
        </Text>
      </VStack>
    </button>
  );
}

interface AssetTileProps {
  src: string;
  name: string;
  onDelete: () => void;
  deleting: boolean;
  aspect?: 'square' | 'video';
}

function AssetTile({
  src,
  name,
  onDelete,
  deleting,
  aspect = 'square',
}: AssetTileProps) {
  const aspectClass = aspect === 'square' ? 'aspect-square' : 'aspect-video';
  return (
    <div
      className={`group relative ${aspectClass} rounded-md overflow-hidden border border-border bg-surface transition-all duration-200 ${
        deleting ? 'opacity-50 scale-95' : 'hover:border-accent/50'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* 底部 hover 工具条：渐变遮罩 + 名称 + 删除按钮 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6 pb-1.5 px-2 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Text
          size="2xs"
          weight="medium"
          className="text-white truncate drop-shadow"
        >
          {name}
        </Text>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`删除：${name}`}
          className="shrink-0 w-5 h-5 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}
