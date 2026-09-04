'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type FormMessage } from '@/components/settings/FormSaveBar';
import { useFileUpload } from '@/hooks/useFileUpload';
import { ApiError } from '@/lib/request/ApiError';
import { iconsApi, preferencesApi } from '@/services';
import type { BrandConfig } from '@/types';

const LOGO_PATTERN = /^(|https?:\/\/.+|\/api\/icons\/file.+)$/;

/**
 * 品牌表单控制器：集中承载品牌状态、校验与保存逻辑，
 * 让 BrandForm 组件退化为受控渲染层。
 */
export function useBrandFormController(initialBrand: BrandConfig) {
  const router = useRouter();
  const [brand, setBrand] = useState(initialBrand);
  const [savedBrand, setSavedBrand] = useState(initialBrand);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);

  const update = <K extends keyof BrandConfig>(
    key: K,
    value: BrandConfig[K],
  ) => {
    setBrand((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const logoUpload = useFileUpload({
    accept:
      'image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon',
    onFile: async (file) => {
      const result = await iconsApi.upload(file, 'brand');
      update('logo', result.path);
      setMessage({ type: 'success', text: 'Logo 已上传，保存后生效' });
    },
  });

  const titleError = brand.title.trim() ? undefined : '标题必填';
  const logoError = LOGO_PATTERN.test(brand.logo.trim())
    ? undefined
    : 'Logo 仅支持上传文件或 http(s) 地址';
  const isDirty =
    brand.title.trim() !== savedBrand.title.trim() ||
    brand.logo.trim() !== savedBrand.logo.trim() ||
    brand.showLogo !== savedBrand.showLogo ||
    brand.showTitle !== savedBrand.showTitle;
  const canSave =
    !saving && !logoUpload.uploading && isDirty && !titleError && !logoError;

  const handleSave = async () => {
    if (!canSave) return;

    const nextBrand = {
      title: brand.title.trim(),
      logo: brand.logo.trim(),
      showLogo: brand.showLogo,
      showTitle: brand.showTitle,
    };
    setSaving(true);
    setMessage(null);
    try {
      await preferencesApi.update('brand', nextBrand);
      setBrand(nextBrand);
      setSavedBrand(nextBrand);
      setMessage({ type: 'success', text: '已保存' });
      router.refresh();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof ApiError ? error.message : '保存失败',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToSaved = () => {
    setBrand(savedBrand);
    setMessage(null);
  };

  return {
    brand,
    message,
    saving,
    isDirty,
    titleError,
    logoError,
    canSave,
    update,
    setMessage,
    handleSave,
    resetToSaved,
    logoUpload,
  };
}
