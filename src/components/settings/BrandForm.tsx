'use client';

import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import {
  type FormMessage,
  FormSaveBar,
} from '@/components/settings/FormSaveBar';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { useFileUpload } from '@/hooks/useFileUpload';
import { DEFAULT_BRAND_CONFIG } from '@/lib/brand-constants';
import { ApiError } from '@/lib/request/ApiError';
import { iconsApi, preferencesApi } from '@/services';
import type { BrandConfig } from '@/types';

interface BrandFormProps {
  initialBrand: BrandConfig;
}

const LOGO_PATTERN = /^(|https?:\/\/.+|\/api\/icons\/file.+)$/;

/** 品牌设置：标题与 Logo */
export function BrandForm({ initialBrand }: BrandFormProps) {
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

  return (
    <SettingsSection
      title="品牌"
      description="自定义站点标题与 Logo"
    >
      {logoUpload.input}

      {/* 预览列 + 字段列：点击 Logo 触发上传，hover 遮罩提示（GitHub 模式） */}
      <HStack gap={5} align="center">
        <button
          type="button"
          onClick={() => logoUpload.open()}
          title="点击更换 Logo"
          aria-label="上传 Logo"
          className="group relative shrink-0 cursor-pointer overflow-hidden rounded-[18px] transition-[transform,box-shadow] hover:ring-2 hover:ring-border active:scale-95"
        >
          <BrandMark
            size="xl"
            logo={brand.logo}
            aria-label={brand.title || DEFAULT_BRAND_CONFIG.title}
          />
          {/* hover 遮罩：提示可点击更换 */}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera size={20} className="text-white" />
          </span>
        </button>
        <VStack gap={4} className="flex-1">
          <TextInput
            label="站点标题"
            value={brand.title}
            onChange={(value) => update('title', value)}
            width="100%"
            placeholder="NavDeck"
            isRequired
            status={
              titleError ? { type: 'error', message: titleError } : undefined
            }
          />
          <TextInput
            label="Logo 地址"
            value={brand.logo}
            onChange={(value) => update('logo', value)}
            width="100%"
            placeholder="留空使用内置标识"
            startIcon={<ImageIcon size={16} />}
            hasClear
            status={
              logoError ? { type: 'error', message: logoError } : undefined
            }
          />
        </VStack>
      </HStack>

      {/* 显示开关 */}
      <HStack gap={8} align="center">
        <CheckboxInput
          label="显示 Logo"
          value={brand.showLogo}
          onChange={(checked) => update('showLogo', checked)}
        />
        <CheckboxInput
          label="显示标题"
          value={brand.showTitle}
          onChange={(checked) => update('showTitle', checked)}
        />
      </HStack>

      <FormSaveBar
        message={message ?? null}
        isDirty={isDirty && !titleError && !logoError}
        saving={saving}
        onReset={() => {
          setBrand(savedBrand);
          setMessage(null);
        }}
        onSave={() => void handleSave()}
      />
    </SettingsSection>
  );
}