'use client';

import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { CategorySelector } from '@/components/categories/CategorySelector';
import { getUploadedIconPath } from '@/lib/icon-source';
import { ApiError } from '@/lib/request/ApiError';
import { type CardFormValues, cardCreateSchema } from '@/lib/validation';
import { iconsApi } from '@/services';
import { cardsApi } from '@/services/cards';
import type { Card, Category } from '@/types';
import { IconPicker, type IconUploadSelection } from './IconPicker';

interface CardEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入 card 表示编辑模式，null 表示新建 */
  card: Card | null;
  /** 可选分类列表 */
  categories: Category[];
  onSaved: () => void;
  /** 新建模式预填分类 ID（null = 未分类；undefined = 不预填）。
   *  仅当 card=null 时生效；编辑模式忽略此参数。 */
  initialCategoryId?: string | null;
}

/**
 * 卡片编辑 Modal（react-hook-form + zod 校验）
 *
 * 校验策略：
 * - 客户端：zod schema 在 onChange 时校验，提交前 formState.errors 阻止提交
 * - 服务端：API 路由二次校验作为兜底，错误通过 ApiError.fieldErrors 映射到字段
 *
 * 字段级错误通过 Astryx TextInput 的 status prop 显示（红框 + 浮动消息）
 */
export function CardEditModal({
  isOpen,
  onOpenChange,
  card,
  categories,
  onSaved,
  initialCategoryId,
}: CardEditModalProps) {
  return (
    <CardEditModalInner
      key={card?.id ?? `new-${initialCategoryId ?? 'none'}`}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      card={card}
      categories={categories}
      onSaved={onSaved}
      initialCategoryId={initialCategoryId}
    />
  );
}

function CardEditModalInner({
  isOpen,
  onOpenChange,
  card,
  categories,
  onSaved,
  initialCategoryId,
}: CardEditModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingIconUpload, setPendingIconUpload] =
    useState<IconUploadSelection | null>(null);
  const pendingIconUploadRef = useRef<IconUploadSelection | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(cardCreateSchema),
    defaultValues: {
      name: card?.name ?? '',
      internalUrl: card?.internalUrl ?? '',
      externalUrl: card?.externalUrl ?? '',
      icon: card?.icon ?? '',
      description: card?.description ?? '',
      categoryId: card?.categoryId ?? initialCategoryId ?? '',
    },
    mode: 'onTouched', // 字段失焦后开始校验，避免一输入就报红
  });

  // useWatch 替代 watch，避免 React Compiler 警告（watch 返回的函数无法被 memoize）
  const watchedName = useWatch({ control, name: 'name' });
  const watchedIcon = useWatch({ control, name: 'icon' }) ?? '';
  const watchedInternalUrl = useWatch({ control, name: 'internalUrl' });
  const watchedExternalUrl = useWatch({ control, name: 'externalUrl' });

  const handleIconUploadSelectionChange = useCallback(
    (selection: IconUploadSelection | null) => {
      setPendingIconUpload(selection);
    },
    [],
  );

  useEffect(() => {
    pendingIconUploadRef.current = pendingIconUpload;
  }, [pendingIconUpload]);

  useEffect(() => {
    const selection = pendingIconUpload;
    if (!selection || watchedIcon === selection.previewUrl) return;

    URL.revokeObjectURL(selection.previewUrl);
    pendingIconUploadRef.current = null;
    setPendingIconUpload(null);
  }, [pendingIconUpload, watchedIcon]);

  useEffect(() => {
    if (isOpen) return;

    const selection = pendingIconUploadRef.current;
    if (!selection) return;

    URL.revokeObjectURL(selection.previewUrl);
    pendingIconUploadRef.current = null;
    setPendingIconUpload(null);
  }, [isOpen]);

  const onSubmit = async (values: Record<string, unknown>) => {
    setSubmitError(null);

    let iconValue = typeof values.icon === 'string' ? values.icon : '';
    let uploadedPath: string | null = null;
    if (pendingIconUpload && iconValue === pendingIconUpload.previewUrl) {
      try {
        const uploaded = await iconsApi.upload(pendingIconUpload.file, 'cards');
        iconValue = uploaded.path;
        uploadedPath = getUploadedIconPath(uploaded.path);
      } catch {
        setSubmitError('图标上传失败，请重试');
        return;
      }
    }

    const nextValues = { ...values, icon: iconValue };

    try {
      if (card) {
        await cardsApi.update(card.id, nextValues as CardFormValues);
      } else {
        await cardsApi.create(nextValues as CardFormValues);
      }

      const previousUploadPath = card ? getUploadedIconPath(card.icon) : null;
      if (
        previousUploadPath &&
        previousUploadPath !== getUploadedIconPath(iconValue)
      ) {
        await iconsApi.delete(previousUploadPath).catch(() => undefined);
      }

      if (pendingIconUpload) {
        URL.revokeObjectURL(pendingIconUpload.previewUrl);
        pendingIconUploadRef.current = null;
        setPendingIconUpload(null);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      if (uploadedPath) {
        await iconsApi.delete(uploadedPath).catch(() => undefined);
      }
      if (err instanceof ApiError && err.fieldErrors) {
        // 映射到表单字段
        const validFields = [
          'name',
          'internalUrl',
          'externalUrl',
          'icon',
          'description',
          'categoryId',
        ] as const;
        for (const [field, msgs] of Object.entries(err.fieldErrors)) {
          if (validFields.includes(field as (typeof validFields)[number])) {
            setError(field as (typeof validFields)[number], {
              message: msgs[0],
            });
          }
        }
        return;
      }
      setSubmitError(err instanceof Error ? err.message : '保存失败');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={520}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="contents">
        <Layout
          header={
            <DialogHeader
              title={card ? `编辑卡片：${card.name}` : '新建卡片'}
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                {/* 名称 + 分类：各占 50%（用 CSS Grid 保证均分，避免 width="100%" 与 flex-1 冲突） */}
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <TextInput
                        label="名称"
                        placeholder="如：Jellyfin"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        isRequired
                        width="100%"
                        status={
                          errors.name
                            ? { type: 'error', message: errors.name.message }
                            : undefined
                        }
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field }) => (
                      <CategorySelector
                        categories={categories}
                        label="分类"
                        value={field.value}
                        onChange={field.onChange}
                        isOptional
                        status={
                          errors.categoryId
                            ? {
                                type: 'error',
                                message: errors.categoryId.message,
                              }
                            : undefined
                        }
                      />
                    )}
                  />
                </div>

                <Controller
                  control={control}
                  name="internalUrl"
                  render={({ field }) => (
                    <TextInput
                      label="内网地址"
                      placeholder="http://192.168.1.10:8096"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      isRequired
                      width="100%"
                      status={
                        errors.internalUrl
                          ? {
                              type: 'error',
                              message: errors.internalUrl.message,
                            }
                          : undefined
                      }
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="externalUrl"
                  render={({ field }) => (
                    <TextInput
                      label="外网地址"
                      placeholder="选填，留空与内网地址一致"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      isOptional
                      width="100%"
                      status={
                        errors.externalUrl
                          ? {
                              type: 'error',
                              message: errors.externalUrl.message,
                            }
                          : undefined
                      }
                    />
                  )}
                />

                {/* 图标：保持 IconPicker 原布局 */}
                <Controller
                  control={control}
                  name="icon"
                  render={({ field }) => (
                    <>
                      <IconPicker
                        value={field.value ?? ''}
                        cardName={watchedName}
                        sourceUrl={watchedInternalUrl || watchedExternalUrl}
                        onChange={field.onChange}
                        uploadSelection={pendingIconUpload}
                        onUploadSelectionChange={
                          handleIconUploadSelectionChange
                        }
                        disabled={isSubmitting}
                      />
                      {errors.icon && (
                        <Text size="sm" className="text-danger" role="alert">
                          {errors.icon.message}
                        </Text>
                      )}
                    </>
                  )}
                />

                {/* 描述：单行占满 */}
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <TextInput
                      label="描述"
                      placeholder="选填，简短描述"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      isOptional
                      width="100%"
                      status={
                        errors.description
                          ? {
                              type: 'error',
                              message: errors.description.message,
                            }
                          : undefined
                      }
                    />
                  )}
                />

                {submitError && (
                  <Text size="sm" className="text-danger" role="alert">
                    {submitError}
                  </Text>
                )}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} justify="end">
                <Button
                  label="取消"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  type="button"
                  isDisabled={isSubmitting}
                />
                <Button
                  label="保存"
                  variant="primary"
                  type="submit"
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
