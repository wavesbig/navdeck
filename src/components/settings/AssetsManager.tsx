'use client';

import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ImagePlus, Shapes, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { useFileUpload } from '@/hooks/useFileUpload';
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

/**
 * 素材管理
 *
 * 图标与壁纸图片两个独立区块：
 * - 各带头部上传按钮与计数
 * - hover tile 显示底部工具条（名称 + 删除按钮）
 * - 空态整体即上传入口
 */
export function AssetsManager({ icons, wallpapers }: AssetsManagerProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const iconUpload = useFileUpload({
    accept:
      'image/png,image/jpeg,image/svg+xml,image/webp,image/gif,image/x-icon',
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

  const handleDelete = async (kind: 'icon' | 'image', key: string) => {
    setDeleting(key);
    setDeleteError(null);
    try {
      if (kind === 'icon') {
        await iconsApi.delete(key);
      } else {
        await wallpapersApi.delete(key);
      }
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <SettingsSection
        title="图标"
        description={
          icons.length > 0
            ? `${icons.length} 个已上传的自定义图标`
            : '上传自定义图标，供卡片编辑时选用'
        }
        actions={
          <Button
            label={iconUpload.uploading ? '上传中…' : '上传图标'}
            variant="secondary"
            size="sm"
            icon={<Upload size={14} />}
            isLoading={iconUpload.uploading}
            onClick={() => iconUpload.open()}
          />
        }
      >
        {iconUpload.input}

        {icons.length === 0 ? (
          <EmptyState
            icon={<Shapes size={18} className="text-accent" />}
            label="还没有上传的图标"
            onUpload={() => iconUpload.open()}
            uploading={iconUpload.uploading}
          />
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {icons.map((icon) => (
              <AssetTile
                key={icon.path}
                src={`/api/icons/file?path=${icon.path}`}
                name={icon.name}
                onDelete={() => handleDelete('icon', icon.path)}
                deleting={deleting === icon.path}
              />
            ))}
          </div>
        )}

        {iconUpload.error && <ErrorText text={iconUpload.error} />}
      </SettingsSection>

      <SettingsSection
        title="壁纸图片"
        description={
          wallpapers.length > 0
            ? `${wallpapers.length} 张已上传图片，可在外观设置中设为壁纸`
            : '上传图片，可在外观设置中设为壁纸'
        }
        actions={
          <Button
            label={imageUpload.uploading ? '上传中…' : '上传图片'}
            variant="secondary"
            size="sm"
            icon={<Upload size={14} />}
            isLoading={imageUpload.uploading}
            onClick={() => imageUpload.open()}
          />
        }
      >
        {imageUpload.input}

        {wallpapers.length === 0 ? (
          <EmptyState
            icon={<ImagePlus size={18} className="text-accent" />}
            label="还没有上传的图片"
            onUpload={() => imageUpload.open()}
            uploading={imageUpload.uploading}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {wallpapers.map((wp) => (
              <AssetTile
                key={wp.id}
                src={wp.path}
                name={wp.name}
                onDelete={() => handleDelete('image', wp.id)}
                deleting={deleting === wp.id}
                aspect="video"
              />
            ))}
          </div>
        )}

        {imageUpload.error && <ErrorText text={imageUpload.error} />}
      </SettingsSection>

      {deleteError && <ErrorText text={deleteError} />}
    </>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <Text size="sm" className="text-danger" role="alert">
      {text}
    </Text>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  label: string;
  onUpload: () => void;
  uploading: boolean;
}

/** 空态：整块区域即上传入口 */
function EmptyState({ icon, label, onUpload, uploading }: EmptyStateProps) {
  return (
    <button
      type="button"
      onClick={onUpload}
      disabled={uploading}
      className="w-full rounded-panel border border-dashed border-border py-10 px-4 flex flex-col items-center justify-center gap-3 transition-colors hover:border-accent hover:bg-accent/5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
        {icon}
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
      className={`group relative ${aspectClass} rounded-control overflow-hidden border border-border bg-surface transition-[opacity,transform,border-color] duration-200 ${
        deleting ? 'opacity-50 scale-95' : 'hover:border-accent/50'
      }`}
    >
      <Image
        src={src}
        alt={name}
        fill
        sizes="(max-width: 768px) 50vw, 33vw"
        unoptimized
        className="object-cover"
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
