'use client';

import {useState} from 'react';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Text} from '@astryxdesign/core/Text';
import {IconPicker} from './IconPicker';
import type {Card, Category} from '@/types';

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

interface FormState {
  name: string;
  internalUrl: string;
  externalUrl: string;
  icon: string;
  description: string;
  categoryId: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  internalUrl: '',
  externalUrl: '',
  icon: '',
  description: '',
  categoryId: '',
};

function buildInitialForm(
  card: Card | null,
  initialCategoryId?: string | null
): FormState {
  if (!card) {
    // 新建模式：预填分类（'' 留作未分类选项）
    return {...EMPTY_FORM, categoryId: initialCategoryId ?? ''};
  }
  return {
    name: card.name,
    internalUrl: card.internalUrl,
    externalUrl: card.externalUrl,
    icon: card.icon,
    description: card.description ?? '',
    categoryId: card.categoryId ?? '',
  };
}

/**
 * 卡片编辑 Modal
 *
 * 字段（按 ui-spec §8.7 调整）：
 * - name 必填
 * - internalUrl 必填
 * - externalUrl 必填
 * - icon 必填（M1.10 起接入 IconPicker：抓取 / 上传 / 图标库 / 手动输入）
 * - description 选填
 * - categoryId 选填（下拉选择，来自 categories prop）
 *
 * 用 key={card?.id ?? 'new'} 强制重新挂载，避免 useEffect 同步 form
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
  const [form, setForm] = useState<FormState>(() =>
    buildInitialForm(card, initialCategoryId)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url = card ? `/api/cards/${card.id}` : '/api/cards';
      const method = card ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: form.name,
          internalUrl: form.internalUrl,
          externalUrl: form.externalUrl,
          icon: form.icon,
          description: form.description || null,
          categoryId: form.categoryId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '保存失败');
        return;
      }

      onSaved();
      onOpenChange(false);
    } catch {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

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

      <form onSubmit={handleSubmit}>
        <VStack gap={3}>
          <TextInput
            label="名称"
            placeholder="如：Jellyfin"
            value={form.name}
            onChange={(v) => setForm({...form, name: v})}
            isRequired
            width="100%"
          />

          <TextInput
            label="内网地址"
            placeholder="http://192.168.1.10:8096"
            value={form.internalUrl}
            onChange={(v) => setForm({...form, internalUrl: v})}
            isRequired
            width="100%"
          />

          <TextInput
            label="外网地址"
            placeholder="https://jellyfin.example.com"
            value={form.externalUrl}
            onChange={(v) => setForm({...form, externalUrl: v})}
            isRequired
            width="100%"
          />

          <IconPicker
            value={form.icon}
            cardName={form.name}
            sourceUrl={form.internalUrl || form.externalUrl}
            onChange={(v) => setForm({...form, icon: v})}
          />

          <TextInput
            label="描述"
            placeholder="选填，简短描述"
            value={form.description}
            onChange={(v) => setForm({...form, description: v})}
            width="100%"
          />

          {/* 分类下拉选择：原生 select + token 样式 */}
          <VStack gap={1} align="start">
            <Text size="sm" weight="medium">
              分类
            </Text>
            <select
              value={form.categoryId}
              onChange={(e) =>
                setForm({...form, categoryId: e.target.value})
              }
              className="w-full h-9 px-3 rounded-md border border-border bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">未分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </VStack>

          {error && (
            <Text size="sm" className="text-danger" role="alert">
              {error}
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
              label={saving ? '保存中...' : '保存'}
              variant="primary"
              type="submit"
              isDisabled={saving}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
