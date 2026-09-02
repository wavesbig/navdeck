'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/request/ApiError';

interface UseFileUploadOptions {
  /** input 的 accept 属性 */
  accept: string;
  /** 选中文件后的上传动作（抛错会被捕获并写入 error） */
  onFile: (file: File) => Promise<void> | void;
}

/**
 * 文件上传通用逻辑
 *
 * 统一各设置表单散落实现的「隐藏 input + 触发 + loading + 错误」模式：
 * - BrandForm（Logo）、AssetsManager（图标/壁纸）、
 *   IconPicker（卡片图标）、WallpaperManager（壁纸）
 *
 * 返回的 input 需渲染一次，open() 供任意按钮/空态触发文件选择。
 */
export function useFileUpload({ accept, onFile }: UseFileUploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 文件选择取消的 cancel 会冒泡到外层 Dialog，被误判为关闭请求。
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const stopCancel = (event: Event) => event.stopPropagation();
    input.addEventListener('cancel', stopCancel);
    return () => input.removeEventListener('cancel', stopCancel);
  }, []);

  const open = () => inputRef.current?.click();

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 允许重复选择同一文件
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await onFile(file);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      className="hidden"
      onChange={(e) => void handleChange(e)}
    />
  );

  return { input, open, uploading, error, clearError: () => setError(null) };
}
