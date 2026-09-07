'use client';

import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { CategoryBadge } from '@/components/categories/CategoryBadge';
import { CategoryColorPicker } from '@/components/categories/CategoryColorPicker';
import { CategoryIconPicker } from '@/components/categories/CategoryIconPicker';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ApiError } from '@/lib/request/ApiError';
import { categoriesApi } from '@/services/categories';
import type { Category, CategoryReorderItem } from '@/types';

interface CategoryManagerProps {
  /** SSR 时从服务端拉取的分类列表 */
  initialCategories: Category[];
}

interface EditFormState {
  name: string;
  icon: string;
  color: string;
}

const EMPTY_CATEGORY_FORM: EditFormState = { name: '', icon: '', color: '' };

/**
 * 分类管理
 *
 * - 列表展示所有分类（含卡片数量）
 * - 拖拽排序（vertical）
 * - 新建 / 编辑 / 删除（删除时卡片归到未分类）
 */
export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();
  const [pendingDeleteCategory, setPendingDeleteCategory] =
    useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [categoryDeleteDescription, setCategoryDeleteDescription] =
    useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // 乐观更新
      const reordered = arrayMove(categories, oldIndex, newIndex);
      setCategories(reordered);

      // 持久化
      const items: CategoryReorderItem[] = reordered.map((c, i) => ({
        id: c.id,
        order: i,
      }));
      try {
        await categoriesApi.reorder(items);
      } catch (e) {
        console.error('保存分类排序失败', e);
        showToast({ body: '分类排序保存失败', type: 'error' });
        // 回滚
        setCategories(categories);
      }
    },
    [categories, showToast],
  );

  const handleNew = () => {
    setEditing(null);
    setError(null);
    setModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditing(category);
    setError(null);
    setModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    const cardCount = category.cards?.length ?? 0;
    const description =
      cardCount > 0
        ? `确认删除分类「${category.name}」吗？该分类下 ${cardCount} 张卡片会归到未分类。`
        : `确认删除分类「${category.name}」吗？`;
    setPendingDeleteCategory(category);
    setCategoryDeleteDescription(description);
  };

  const confirmDeleteCategory = async () => {
    if (!pendingDeleteCategory || deletingCategory) return;
    const category = pendingDeleteCategory;
    setDeletingCategory(true);
    try {
      await categoriesApi.delete(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      setPendingDeleteCategory(null);
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        showToast({ body: '网络错误', type: 'error' });
      } else if (err instanceof ApiError) {
        const data = err.data as { error?: string } | undefined;
        showToast({ body: data?.error ?? '删除失败', type: 'error' });
      } else {
        showToast({ body: '删除失败', type: 'error' });
      }
    } finally {
      setDeletingCategory(false);
    }
  };

  const handleSubmit = async (form: EditFormState) => {
    setError(null);
    setSaving(true);
    try {
      const body = {
        name: form.name,
        icon: form.icon || null,
        color: form.color || null,
      };
      const saved = editing
        ? await categoriesApi.update(editing.id, body)
        : await categoriesApi.create(body);

      // 更新本地列表
      if (editing) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === saved.id ? { ...saved, cards: c.cards } : c,
          ),
        );
      } else {
        setCategories((prev) => [...prev, saved]);
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        setError('网络错误');
      } else if (err instanceof ApiError) {
        const data = err.data as { error?: string } | undefined;
        setError(data?.error ?? '保存失败');
      } else {
        setError('保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      title="分类"
      description="拖拽排序，右侧按钮编辑或删除"
      actions={
        <Button
          label="新建分类"
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={handleNew}
        />
      }
    >
      {categories.length === 0 ? (
        <div className="rounded-panel border border-dashed border-border p-8 flex items-center justify-center">
          <Text size="sm" color="secondary">
            暂无分类，点击「新建分类」开始创建
          </Text>
        </div>
      ) : (
        <div className="rounded-panel border border-border overflow-hidden -mx-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <VStack gap={0}>
                {categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onEdit={() => handleEdit(category)}
                    onDelete={() => handleDelete(category)}
                  />
                ))}
              </VStack>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <CategoryEditModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        category={editing}
        error={error}
        saving={saving}
        onSubmit={handleSubmit}
      />
      <AlertDialog
        isOpen={pendingDeleteCategory !== null}
        onOpenChange={(open) => {
          if (!open && !deletingCategory) setPendingDeleteCategory(null);
        }}
        title="删除分类"
        description={categoryDeleteDescription}
        cancelLabel="取消"
        actionLabel="删除"
        isActionLoading={deletingCategory}
        onAction={() => void confirmDeleteCategory()}
        width={420}
      />
    </SettingsSection>
  );
}

interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}

/** 单行分类：拖拽手柄 + 名称 + 卡片数 + 编辑/删除按钮 */
function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const cardCount = category.cards?.length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-surface hover:bg-overlay-hover transition-colors border-b border-border last:border-b-0"
      suppressHydrationWarning
    >
      {/* 拖拽手柄 */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-secondary hover:text-primary touch-none"
        aria-label="拖拽排序"
        suppressHydrationWarning
      >
        <GripVertical size={16} />
      </button>

      {/* 分类徽章：与主页视觉一致的组合预览 */}
      <CategoryBadge
        name={category.name}
        icon={category.icon}
        color={category.color}
        size="md"
      />

      {/* 名称 */}
      <Text size="sm" className="flex-1 min-w-0 truncate">
        {category.name}
      </Text>

      {/* 卡片数 */}
      <Text size="sm" color="secondary">
        {cardCount} 张卡片
      </Text>

      {/* 操作按钮 */}
      <IconButton
        label="编辑分类"
        icon={<Pencil size={14} />}
        variant="ghost"
        size="sm"
        tooltip="编辑"
        onClick={onEdit}
      />
      <IconButton
        label="删除分类"
        icon={<Trash2 size={14} />}
        variant="ghost"
        size="sm"
        tooltip="删除"
        onClick={onDelete}
      />
    </div>
  );
}

interface CategoryEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  error: string | null;
  saving: boolean;
  onSubmit: (form: EditFormState) => void;
}

/** 新建/编辑分类 Modal */
function CategoryEditModal({
  isOpen,
  onOpenChange,
  category,
  error,
  saving,
  onSubmit,
}: CategoryEditModalProps) {
  return (
    <CategoryEditModalInner
      key={category?.id ?? 'new'}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      category={category}
      error={error}
      saving={saving}
      onSubmit={onSubmit}
    />
  );
}

function CategoryEditModalInner({
  isOpen,
  onOpenChange,
  category,
  error,
  saving,
  onSubmit,
}: CategoryEditModalProps) {
  const [form, setForm] = useState<EditFormState>(() =>
    category
      ? {
          name: category.name,
          icon: category.icon ?? '',
          color: category.color ?? '',
        }
      : EMPTY_CATEGORY_FORM,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const hasCustomization = Boolean(form.icon || form.color);

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={420}
    >
      <form onSubmit={handleSubmit} className="contents">
        <Layout
          header={
            <DialogHeader
              title={category ? `编辑分类：${category.name}` : '新建分类'}
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <FormLayout direction="vertical">
                <VStack gap={1.5} width="100%" align="center">
                  <CategoryIconPicker
                    value={form.icon}
                    onChange={(v) => setForm({ ...form, icon: v })}
                    triggerLabel="点击更换图标"
                    trigger={
                      <CategoryBadge
                        name={form.name || '?'}
                        icon={form.icon}
                        color={form.color}
                        size="lg"
                      />
                    }
                  />
                  <Text size="2xs" color="secondary">
                    点击徽章更换图标
                  </Text>
                </VStack>

                <TextInput
                  label="名称"
                  placeholder="如：媒体服务"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  isRequired
                  width="100%"
                />

                <VStack gap={2} width="100%">
                  <div className="flex items-center justify-between">
                    <Text size="sm" weight="medium" as="label">
                      颜色
                    </Text>
                    {form.color && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, color: '' })}
                        className="text-secondary hover:text-danger transition-colors text-xs"
                        aria-label="清除颜色"
                      >
                        清除
                      </button>
                    )}
                  </div>
                  <CategoryColorPicker
                    value={form.color}
                    onChange={(v) => setForm({ ...form, color: v })}
                  />
                </VStack>

                {!hasCustomization && (
                  <Text size="2xs" color="secondary" className="text-center">
                    可选：为分类添加图标和颜色以增强识别度
                  </Text>
                )}

                {error && (
                  <Text size="sm" className="text-danger" role="alert">
                    {error}
                  </Text>
                )}
              </FormLayout>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} justify="end">
                <Button
                  label="取消"
                  variant="ghost"
                  type="button"
                  onClick={() => onOpenChange(false)}
                  isDisabled={saving}
                />
                <Button
                  label="保存"
                  variant="primary"
                  type="submit"
                  isLoading={saving}
                  isDisabled={saving || !form.name.trim()}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
