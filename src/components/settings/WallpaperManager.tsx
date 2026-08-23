'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Trash2, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useRef, useState } from 'react';
import { preferencesApi, wallpapersApi } from '@/services';
import type { Wallpaper, WallpaperPreferences } from '@/types';

interface WallpaperManagerProps {
  wallpapers: Wallpaper[];
  preferences: WallpaperPreferences;
}

/**
 * 壁纸管理（Linear / Vercel 风格）
 *
 * - 默认展开，无 expanded 状态
 * - 点击缩略图只更新本地 selectedId，不发请求
 * - 上传后只加入列表，不自动选中
 * - 底部统一「撤销」+「应用」保存栏
 */
export function WallpaperManager({
  wallpapers,
  preferences,
}: WallpaperManagerProps) {
  const router = useRouter();
  // 本地选中态（可能是 null = 清除，string = 选中某张，undefined = 未改动）
  const [selectedId, setSelectedId] = useState<string | null | undefined>(
    undefined,
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当前已应用的壁纸（来自 props）
  const appliedId = preferences.wallpaper;
  // 渲染时用：本地有改动用本地，否则用已应用值
  const renderId = selectedId === undefined ? (appliedId ?? null) : selectedId;
  const isDirty = renderId !== (appliedId ?? null);

  const handleApply = async () => {
    if (!isDirty) return;
    const value = selectedId === undefined ? null : selectedId;
    setSaving(true);
    setError(null);
    try {
      await preferencesApi.update('wallpaper', value);
      setSelectedId(undefined);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedId(undefined);
    setError(null);
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await wallpapersApi.upload(file);
      // 上传成功后刷新列表，不自动选中
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setError(null);
    try {
      await wallpapersApi.delete(id);
      // 如果删除的是当前本地选中，重置本地态
      if (selectedId === id) {
        setSelectedId(undefined);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setDeleting(null);
    }
  };

  const selected = wallpapers.find((w) => w.id === renderId) ?? null;
  const presets = wallpapers.filter((w) => w.source === 'preset');
  const uploads = wallpapers.filter((w) => w.source === 'upload');

  return (
    <Card padding={5} variant="default">
      <VStack gap={5}>
        {/* Section header */}
        <VStack gap={1}>
          <Heading level={5}>壁纸</Heading>
          <Text size="sm" color="secondary">
            选择桌面背景图
          </Text>
        </VStack>

        <Divider />

        {/* 当前壁纸预览 */}
        <VStack gap={2}>
          <Text size="sm" weight="medium">
            当前壁纸
          </Text>
          {selected ? (
            <div
              className="w-full h-32 rounded-panel border border-border bg-cover bg-center bg-no-repeat overflow-hidden relative"
              style={{ backgroundImage: `url(${selected.path})` }}
            >
              <div className="absolute inset-0 bg-black/20" />
              {/* 右上角清除按钮 */}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                disabled={saving || uploading}
                aria-label="清除壁纸"
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                <Text
                  size="sm"
                  weight="medium"
                  className="text-white drop-shadow"
                >
                  {selected.name}
                </Text>
                <Text size="sm" className="text-white/80 drop-shadow">
                  {selected.source === 'preset' ? '预设' : '上传'}
                </Text>
              </div>
            </div>
          ) : (
            <div className="w-full h-20 rounded-panel border border-dashed border-border flex items-center justify-center">
              <Text size="sm" color="secondary">
                未设置壁纸，使用主题默认背景色
              </Text>
            </div>
          )}
        </VStack>

        <Divider />

        {/* 隐藏的文件 input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleUpload}
        />

        {/* 预设 */}
        {presets.length > 0 && (
          <VStack gap={2}>
            <Text size="sm" weight="medium">
              预设
            </Text>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((w) => (
                <WallpaperThumb
                  key={w.id}
                  wallpaper={w}
                  isSelected={w.id === renderId}
                  disabled={saving || uploading}
                  onClick={() => setSelectedId(w.id)}
                />
              ))}
            </div>
          </VStack>
        )}

        {/* 我的上传 */}
        <VStack gap={2}>
          <HStack justify="between" align="center">
            <Text size="sm" weight="medium">
              我的上传
            </Text>
            <Button
              label={uploading ? '上传中...' : '上传新壁纸'}
              variant="ghost"
              size="sm"
              icon={<Upload size={14} />}
              isDisabled={uploading || saving}
              onClick={() => fileInputRef.current?.click()}
            />
          </HStack>
          {uploads.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {uploads.map((w) => (
                <WallpaperThumb
                  key={w.id}
                  wallpaper={w}
                  isSelected={w.id === renderId}
                  disabled={saving || uploading}
                  onClick={() => setSelectedId(w.id)}
                  onDelete={() => handleDelete(w.id)}
                  deleting={deleting === w.id}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-panel border border-dashed border-border p-4 flex items-center justify-center">
              <Text size="sm" color="secondary">
                还没有上传的壁纸
              </Text>
            </div>
          )}
        </VStack>

        <Divider />

        {/* 底部保存栏 */}
        <HStack gap={2} justify="between" align="center">
          {error ? (
            <Text size="2xs" className="text-danger">
              {error}
            </Text>
          ) : (
            <span />
          )}
          <HStack gap={2}>
            <Button
              label="撤销"
              variant="ghost"
              size="sm"
              isDisabled={!isDirty || saving}
              onClick={handleReset}
            />
            <Button
              label="应用"
              variant="primary"
              size="sm"
              isLoading={saving}
              isDisabled={!isDirty}
              onClick={handleApply}
            />
          </HStack>
        </HStack>
      </VStack>
    </Card>
  );
}

interface WallpaperThumbProps {
  wallpaper: Wallpaper;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

function WallpaperThumb({
  wallpaper,
  isSelected,
  disabled,
  onClick,
  onDelete,
  deleting,
}: WallpaperThumbProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: 内部嵌套删除 button，HTML 不允许 button 嵌套 button
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`选择壁纸：${wallpaper.name}`}
      aria-pressed={isSelected}
      className={`group relative aspect-video rounded-control overflow-hidden border-2 cursor-pointer transition-[border-color,box-shadow,opacity,transform] ${
        isSelected
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-border hover:border-accent/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
        deleting ? 'opacity-50 scale-95' : ''
      }`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${wallpaper.path})` }}
      />
      <div className="absolute inset-0 bg-black/20" />

      {/* 底部 hover 工具条：名称 + 删除按钮（仅可删除时显示） */}
      <div
        className={`absolute inset-x-0 bottom-0 pt-6 pb-1 px-2 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-200 ${
          onDelete ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
        }`}
      >
        <Text
          size="2xs"
          weight="medium"
          className="text-white truncate drop-shadow"
        >
          {wallpaper.name}
        </Text>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
            aria-label={`删除：${wallpaper.name}`}
            className="shrink-0 w-5 h-5 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
