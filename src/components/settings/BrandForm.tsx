'use client';

import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { BrandMark } from '@/components/layout/BrandMark';
import { FormSaveBar } from '@/components/settings/FormSaveBar';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { useBrandFormController } from '@/components/settings/useBrandFormController';
import { DEFAULT_BRAND_CONFIG } from '@/lib/brand-constants';
import type { BrandConfig } from '@/types';

interface BrandFormProps {
  initialBrand: BrandConfig;
}

/** 品牌设置：标题与 Logo（状态与保存逻辑见 useBrandFormController） */
export function BrandForm({ initialBrand }: BrandFormProps) {
  const ctl = useBrandFormController(initialBrand);

  return (
    <SettingsSection title="品牌" description="自定义站点标题与 Logo">
      {ctl.logoUpload.input}

      {/* 预览列 + 字段列：点击 Logo 触发上传，hover 遮罩提示（GitHub 模式） */}
      <HStack gap={5} align="center">
        <button
          type="button"
          onClick={() => ctl.logoUpload.open()}
          title="点击更换 Logo"
          aria-label="上传 Logo"
          className="group relative shrink-0 cursor-pointer overflow-hidden rounded-[18px] transition-[transform,box-shadow] hover:ring-2 hover:ring-border active:scale-95"
        >
          <BrandMark
            size="xl"
            logo={ctl.brand.logo}
            aria-label={ctl.brand.title || DEFAULT_BRAND_CONFIG.title}
          />
          {/* hover 遮罩：提示可点击更换 */}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera size={20} className="text-white" />
          </span>
        </button>
        <VStack gap={4} className="flex-1">
          <TextInput
            label="站点标题"
            value={ctl.brand.title}
            onChange={(value) => ctl.update('title', value)}
            width="100%"
            placeholder="NavDeck"
            isRequired
            status={
              ctl.titleError
                ? { type: 'error', message: ctl.titleError }
                : undefined
            }
          />
          <TextInput
            label="Logo 地址"
            value={ctl.brand.logo}
            onChange={(value) => ctl.update('logo', value)}
            width="100%"
            placeholder="留空使用内置标识"
            startIcon={<ImageIcon size={16} />}
            hasClear
            status={
              ctl.logoError
                ? { type: 'error', message: ctl.logoError }
                : undefined
            }
          />
        </VStack>
      </HStack>

      {/* 显示开关 */}
      <HStack gap={8} align="center">
        <CheckboxInput
          label="显示 Logo"
          value={ctl.brand.showLogo}
          onChange={(checked) => ctl.update('showLogo', checked)}
        />
        <CheckboxInput
          label="显示标题"
          value={ctl.brand.showTitle}
          onChange={(checked) => ctl.update('showTitle', checked)}
        />
      </HStack>

      <FormSaveBar
        message={ctl.message ?? null}
        isDirty={ctl.isDirty && !ctl.titleError && !ctl.logoError}
        saving={ctl.saving}
        onReset={ctl.resetToSaved}
        onSave={() => void ctl.handleSave()}
      />
    </SettingsSection>
  );
}
