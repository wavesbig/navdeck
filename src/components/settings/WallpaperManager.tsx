'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { ImagePlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useRef, useState } from 'react';
import type { Wallpaper, WallpaperPreferences } from '@/types';

interface WallpaperManagerProps {
  wallpapers: Wallpaper[];
  preferences: WallpaperPreferences;
}

/**
 * 壁纸管理
 *
 * 一张图适配两种主题（light/dark 共用，靠遮罩调整可读性）。
 * - 预设 + 上传两种来源
 * - 偏好通过 /api/preferences PATCH 更新（单个 wallpaper 字段）
 * - 上传通过 /api/wallpapers/upload（不再传 theme）
 * - 任何修改后 router.refresh() 触发 SSR 重新获取
 */
export function WallpaperManager({
  wallpapers,
  preferences,
}: WallpaperManagerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 切换壁纸偏好
   */
  const handleSelect = async (wallpaperId: string | null) => {
    setSaving(wallpaperId ?? 'none');
    setError(null);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'wallpaper', value: wallpaperId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '保存失败');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setSaving(null);
    }
  };

  /**
   * 上传自定义壁纸并自动选中
   */
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/wallpapers/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '上传失败');
      }
      const wallpaper = (await res.json()) as Wallpaper;
      // 上传成功后自动选中
      await handleSelect(wallpaper.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setUploading(false);
      // 重置 input value 允许重复上传同名文件
      e.target.value = '';
    }
  };

  const selected =
    wallpapers.find((w) => w.id === preferences.wallpaper) ?? null;
  const presets = wallpapers.filter((w) => w.source === 'preset');
  const uploads = wallpapers.filter((w) => w.source === 'upload');

  return (
    <Card padding={4}>
      <VStack gap={3}>
        {/* 头部：标题 + 描述 + 清除按钮 */}
        <HStack justify="between" align="center">
          <VStack gap={0.5}>
            <Heading level={5}>壁纸</Heading>
            <Text size="sm" color="secondary">
              一张图自动适配亮色和暗色主题
            </Text>
          </VStack>
          {selected && (
            <IconButton
              label="清除壁纸"
              tooltip="清除"
              variant="ghost"
              size="sm"
              icon={<X size={14} />}
              onClick={() => handleSelect(null)}
            />
          )}
        </HStack>

        {/* 当前壁纸预览 */}
        {selected ? (
          <div
            className="w-full h-32 rounded-lg border border-border bg-cover bg-center bg-no-repeat overflow-hidden relative"
            style={{ backgroundImage: `url(${selected.path})` }}
          >
            <div className="absolute inset-0 bg-black/20" />
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
          <div className="w-full h-32 rounded-lg border border-dashed border-border flex items-center justify-center">
            <Text size="sm" color="secondary">
              未设置壁纸，将使用主题默认背景色
            </Text>
          </div>
        )}

        {/* 预设网格 */}
        {presets.length > 0 && (
          <VStack gap={1.5}>
            <Text size="sm" weight="medium">
              预设
            </Text>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((w) => (
                <WallpaperThumb
                  key={w.id}
                  wallpaper={w}
                  isSelected={w.id === preferences.wallpaper}
                  disabled={saving !== null}
                  onClick={() => handleSelect(w.id)}
                />
              ))}
            </div>
          </VStack>
        )}

        {/* 用户上传 */}
        {uploads.length > 0 && (
          <VStack gap={1.5}>
            <Text size="sm" weight="medium">
              我的上传
            </Text>
            <div className="grid grid-cols-3 gap-2">
              {uploads.map((w) => (
                <WallpaperThumb
                  key={w.id}
                  wallpaper={w}
                  isSelected={w.id === preferences.wallpaper}
                  disabled={saving !== null}
                  onClick={() => handleSelect(w.id)}
                />
              ))}
            </div>
          </VStack>
        )}

        {/* 上传按钮 */}
        <HStack gap={2}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            label={uploading ? '上传中...' : '上传壁纸'}
            variant="secondary"
            size="sm"
            icon={<ImagePlus size={14} />}
            isDisabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          />
        </HStack>

        {error && (
          <Text size="sm" className="text-danger" role="alert">
            {error}
          </Text>
        )}
      </VStack>
    </Card>
  );
}

interface WallpaperThumbProps {
  wallpaper: Wallpaper;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}

function WallpaperThumb({
  wallpaper,
  isSelected,
  disabled,
  onClick,
}: WallpaperThumbProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`选择壁纸：${wallpaper.name}`}
      aria-pressed={isSelected}
      className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-border hover:border-accent/50'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${wallpaper.path})` }}
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between">
        <Text
          size="sm"
          weight="medium"
          className="text-white text-xs drop-shadow truncate"
        >
          {wallpaper.name}
        </Text>
      </div>
    </button>
  );
}
