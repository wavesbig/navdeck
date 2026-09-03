'use client';

import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { RotateCcw, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { BrandTitle } from '@/components/layout/BrandTitle';
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
    accept: 'image/*',
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
  const isDefault =
    brand.title.trim() === DEFAULT_BRAND_CONFIG.title &&
    brand.logo.trim() === DEFAULT_BRAND_CONFIG.logo &&
    brand.showLogo === DEFAULT_BRAND_CONFIG.showLogo &&
    brand.showTitle === DEFAULT_BRAND_CONFIG.showTitle;
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
      description="自定义站点标题与 Logo，会同步到主页、设置页和登录页"
      actions={
        <HStack gap={1} align="center">
          <IconButton
            label="恢复默认"
            tooltip="恢复默认品牌"
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={14} strokeWidth={1.5} />}
            isDisabled={isDefault}
            onClick={() => {
              setBrand(DEFAULT_BRAND_CONFIG);
              setMessage(null);
            }}
          />
          <Button
            label={logoUpload.uploading ? '上传中…' : '上传 Logo'}
            variant="secondary"
            size="sm"
            icon={<Upload size={14} strokeWidth={1.5} />}
            isLoading={logoUpload.uploading}
            onClick={() => logoUpload.open()}
          />
        </HStack>
      }
    >
      {logoUpload.input}

      <HStack gap={2} align="center">
        <BrandMark
          size="lg"
          logo={brand.logo}
          aria-label={brand.title || DEFAULT_BRAND_CONFIG.title}
        />
        <Text className="truncate brand-title">
          <BrandTitle title={brand.title || DEFAULT_BRAND_CONFIG.title} />
        </Text>
      </HStack>

      <FormLayout>
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
          description="可粘贴 http(s) 图片地址，也可直接上传本地 Logo"
          value={brand.logo}
          onChange={(value) => update('logo', value)}
          width="100%"
          placeholder="留空使用内置标识"
          hasClear
          status={logoError ? { type: 'error', message: logoError } : undefined}
        />
        <CheckboxInput
          label="显示 Logo"
          description="控制主页左上角的品牌标识，不影响本页预览"
          value={brand.showLogo}
          onChange={(checked) => update('showLogo', checked)}
        />
        <CheckboxInput
          label="显示标题"
          description="控制主页左上角的站点标题，不影响本页预览"
          value={brand.showTitle}
          onChange={(checked) => update('showTitle', checked)}
        />
      </FormLayout>

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
