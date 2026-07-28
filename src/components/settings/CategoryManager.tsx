'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
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

const EMPTY_EDIT: EditFormState = { name: '', icon: '', color: '' };

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
        await fetch('/api/categories/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
      } catch (e) {
        console.error('保存分类排序失败', e);
        // 回滚
        setCategories(categories);
      }
    },
    [categories],
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
    const msg =
      cardCount > 0
        ? `确认删除分类「${category.name}」吗？该分类下 ${cardCount} 张卡片会归到未分类。`
        : `确认删除分类「${category.name}」吗？`;
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? '删除失败');
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
    } catch {
      alert('网络错误');
    }
  };

  const handleSubmit = async (form: EditFormState) => {
    setError(null);
    setSaving(true);
    try {
      const url = editing ? `/api/categories/${editing.id}` : '/api/categories';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          icon: form.icon || null,
          color: form.color || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '保存失败');
        return;
      }
      const saved = (await res.json()) as Category;

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
    } catch {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <VStack gap={4}>
      <Card padding={4}>
        <VStack gap={3}>
          <HStack justify="between" align="center">
            <Heading level={5}>分类管理</Heading>
            <Button
              label="新建分类"
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={handleNew}
            />
          </HStack>
          <Text size="sm" color="secondary">
            拖拽手柄调整分类顺序，编辑或删除现有分类
          </Text>

          {categories.length === 0 ? (
            <Text size="sm" color="secondary">
              暂无分类，点击右上角「新建分类」开始创建
            </Text>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <VStack gap={2}>
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
          )}
        </VStack>
      </Card>

      <CategoryEditModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        category={editing}
        error={error}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </VStack>
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
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface hover:bg-overlay-hover transition-colors"
    >
      {/* 拖拽手柄 */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-secondary hover:text-primary touch-none"
        aria-label="拖拽排序"
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
      : EMPTY_EDIT,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={420}
    >
      <DialogHeader
        title={category ? `编辑分类：${category.name}` : '新建分类'}
        onOpenChange={onOpenChange}
      />
      <form onSubmit={handleSubmit}>
        <VStack gap={3}>
          <TextInput
            label="名称"
            placeholder="如：媒体服务"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            isRequired
            width="100%"
          />

          {/* 图标 + 颜色：组合预览 + 双触发器 */}
          <VStack gap={1.5} width="100%">
            <Text size="sm" weight="medium" as="label">
              图标与颜色
            </Text>
            <div className="flex items-center gap-2">
              {/* 组合预览（与列表行 / 主页视觉一致） */}
              <CategoryBadge
                name={form.name || '?'}
                icon={form.icon}
                color={form.color}
                size="lg"
              />
              {/* 图标选择触发器 */}
              <CategoryIconPicker
                value={form.icon}
                onChange={(v) => setForm({ ...form, icon: v })}
              />
              {/* 颜色选择触发器 */}
              <CategoryColorPicker
                value={form.color}
                onChange={(v) => setForm({ ...form, color: v })}
              />
            </div>
          </VStack>

          {error && (
            <Text size="sm" className="text-danger" role="alert">
              {error}
            </Text>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              label="取消"
              variant="ghost"
              type="button"
              onClick={() => onOpenChange(false)}
            />
            <Button
              label={saving ? '保存中...' : '保存'}
              variant="primary"
              type="submit"
              isDisabled={saving || !form.name.trim()}
            />
          </div>
        </VStack>
      </form>
    </Dialog>
  );
}
