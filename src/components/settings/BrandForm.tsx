'use client';

import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { RotateCcw, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { BrandTitle } from '@/components/layout/BrandTitle';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brand, setBrand] = useState(initialBrand);
  const [savedBrand, setSavedBrand] = useState(initialBrand);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const titleError = brand.title.trim() ? undefined : '标题必填';
  const logoError = LOGO_PATTERN.test(brand.logo.trim())
    ? undefined
    : 'Logo 仅支持上传文件或 http(s) 地址';
  const isDirty =
    brand.title.trim() !== savedBrand.title.trim() ||
    brand.logo.trim() !== savedBrand.logo.trim();
  const canSave = !saving && !uploading && isDirty && !titleError && !logoError;

  const update = <K extends keyof BrandConfig>(
    key: K,
    value: BrandConfig[K],
  ) => {
    setBrand((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const result = await iconsApi.upload(file, 'brand');
      update('logo', result.path);
      setMessage({ type: 'success', text: 'Logo 已上传，保存后生效' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof ApiError ? error.message : 'Logo 上传失败',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;

    const nextBrand = {
      title: brand.title.trim(),
      logo: brand.logo.trim(),
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
    <Card padding={5} variant="default">
      <VStack gap={5}>
        <VStack gap={1}>
          <Heading level={5}>品牌</Heading>
          <Text size="sm" color="secondary">
            自定义站点标题与 Logo，会同步到主页、设置页和登录页
          </Text>
        </VStack>

        <Divider />

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
            description="可粘贴 http(s) 图片地址，或直接上传本地 Logo"
            value={brand.logo}
            onChange={(value) => update('logo', value)}
            width="100%"
            placeholder="留空使用内置标识"
            hasClear
            status={
              logoError ? { type: 'error', message: logoError } : undefined
            }
          />
        </FormLayout>

        <HStack gap={2}>
          <Button
            label={uploading ? '上传中…' : '上传 Logo'}
            variant="secondary"
            size="sm"
            isLoading={uploading}
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload size={14} strokeWidth={1.5} />}
          />
          <Button
            label="恢复默认"
            variant="ghost"
            size="sm"
            onClick={() => {
              setBrand(DEFAULT_BRAND_CONFIG);
              setMessage(null);
            }}
            icon={<RotateCcw size={14} strokeWidth={1.5} />}
          />
          <Button
            label="保存"
            variant="primary"
            size="sm"
            isDisabled={!canSave}
            isLoading={saving}
            onClick={() => void handleSave()}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => void handleUpload(event)}
            className="hidden"
          />
        </HStack>

        {message && (
          <Banner
            status={message.type}
            title={message.text}
            isDismissable
            onDismiss={() => setMessage(null)}
          />
        )}
      </VStack>
    </Card>
  );
}
