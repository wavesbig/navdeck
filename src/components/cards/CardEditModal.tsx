'use client';

import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ApiError } from '@/lib/request/ApiError';
import { type CardFormValues, cardCreateSchema } from '@/lib/validation';
import { cardsApi } from '@/services/cards';
import type { Card, Category } from '@/types';
import { IconPicker } from './IconPicker';

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
  const watchedInternalUrl = useWatch({ control, name: 'internalUrl' });
  const watchedExternalUrl = useWatch({ control, name: 'externalUrl' });

  const onSubmit = async (values: Record<string, unknown>) => {
    setSubmitError(null);

    try {
      if (card) {
        await cardsApi.update(card.id, values as CardFormValues);
      } else {
        await cardsApi.create(values as CardFormValues);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
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

  // 分类选项：第一项为未分类（空值），其余为已有分类
  const categoryOptions = [
    { value: '', label: '未分类' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={card ? `编辑卡片：${card.name}` : '新建卡片'}
        onOpenChange={onOpenChange}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
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
                <Selector
                  label="分类"
                  placeholder="选择分类"
                  options={categoryOptions}
                  value={field.value}
                  onChange={field.onChange}
                  isOptional
                  status={
                    errors.categoryId
                      ? { type: 'error', message: errors.categoryId.message }
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
                    ? { type: 'error', message: errors.internalUrl.message }
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
                    ? { type: 'error', message: errors.externalUrl.message }
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
                    ? { type: 'error', message: errors.description.message }
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

          <HStack gap={2} justify="end" className="pt-2">
            <Button
              label="取消"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              type="button"
            />
            <Button
              label={isSubmitting ? '保存中...' : '保存'}
              variant="primary"
              type="submit"
              isDisabled={isSubmitting}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
