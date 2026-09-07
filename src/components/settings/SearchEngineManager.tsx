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
import { Globe, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import {
  IconPicker,
  type IconUploadSelection,
} from '@/components/cards/IconPicker';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ApiError } from '@/lib/request/ApiError';
import { iconsApi } from '@/services';
import { searchEnginesApi } from '@/services/search-engines';
import type { SearchEngineConfig } from '@/types';

interface SearchEngineManagerProps {
  /** SSR 时从服务端取的引擎列表 */
  initialEngines: SearchEngineConfig[];
}

interface EngineFormState {
  name: string;
  urlTemplate: string;
  iconPath: string;
}

const EMPTY_ENGINE_FORM: EngineFormState = {
  name: '',
  urlTemplate: '',
  iconPath: '',
};

/**
 * 搜索引擎管理
 *
 * - 引擎统一管理（内置 5 个已由迁移落库）：拖拽排序、增删改
 * - 服务端保证至少保留一个引擎（最后一行的删除按钮隐藏 + 服务端校验）
 * - 图标复用卡片 IconPicker（图标库 + 上传）
 * - 删除当前默认引擎时服务端自动回退 google
 */
export function SearchEngineManager({
  initialEngines,
}: SearchEngineManagerProps) {
  const [engines, setEngines] = useState(initialEngines);
  const [editing, setEditing] = useState<SearchEngineConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIconUpload, setPendingIconUpload] =
    useState<IconUploadSelection | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SearchEngineConfig | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const showToast = useToast();

  const handleNew = () => {
    setEditing(null);
    setError(null);
    setModalOpen(true);
  };

  const handleEdit = (engine: SearchEngineConfig) => {
    setEditing(engine);
    setError(null);
    setModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) setPendingIconUpload(null);
    setModalOpen(open);
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = engines.findIndex((e) => e.key === active.id);
      const newIndex = engines.findIndex((e) => e.key === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // 乐观更新
      const reordered = arrayMove(engines, oldIndex, newIndex);
      setEngines(reordered);

      try {
        await searchEnginesApi.reorderItems(
          reordered.map((e, i) => ({ id: e.key, order: i })),
        );
      } catch {
        showToast({ body: '排序保存失败', type: 'error' });
        setEngines(engines);
      }
    },
    [engines, showToast],
  );

  const handleDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await searchEnginesApi.remove(pendingDelete.key);
      setEngines((prev) => prev.filter((e) => e.key !== pendingDelete.key));
      setPendingDelete(null);
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        showToast({ body: '网络错误', type: 'error' });
      } else {
        showToast({ body: '删除失败', type: 'error' });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (form: EngineFormState) => {
    setError(null);
    setSaving(true);
    try {
      // 选了本地图标上传：先传文件，落库用返回路径
      let iconValue = form.iconPath;
      if (pendingIconUpload && form.iconPath === pendingIconUpload.previewUrl) {
        const uploaded = await iconsApi.upload(
          pendingIconUpload.file,
          'library',
        );
        iconValue = uploaded.path;
      }

      const body = {
        name: form.name,
        urlTemplate: form.urlTemplate,
        iconPath: iconValue || null,
      };
      const saved = editing
        ? await searchEnginesApi.update(editing.key, body)
        : await searchEnginesApi.create(body);

      if (editing) {
        setEngines((prev) =>
          prev.map((e) => (e.key === saved.key ? saved : e)),
        );
      } else {
        setEngines((prev) => [...prev, saved]);
      }
      setPendingIconUpload(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  return (
    <SettingsSection
      title="搜索引擎"
      description="拖拽排序；至少保留一个引擎"
      actions={
        <Button
          label="添加引擎"
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={handleNew}
        />
      }
    >
      <div className="rounded-panel border border-border overflow-hidden -mx-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={engines.map((e) => e.key)}
            strategy={verticalListSortingStrategy}
          >
            <VStack gap={0}>
              {engines.map((engine) => (
                <EngineRow
                  key={engine.key}
                  engine={engine}
                  isLastEngine={engines.length <= 1}
                  onEdit={() => handleEdit(engine)}
                  onDelete={() => setPendingDelete(engine)}
                />
              ))}
            </VStack>
          </SortableContext>
        </DndContext>
      </div>

      <EngineEditModal
        key={editing?.key ?? 'new'}
        isOpen={modalOpen}
        onOpenChange={handleModalOpenChange}
        engine={editing}
        error={error}
        saving={saving}
        pendingIconUpload={pendingIconUpload}
        onUploadSelectionChange={setPendingIconUpload}
        onSubmit={(form) => void handleSubmit(form)}
      />

      <AlertDialog
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        title="删除引擎"
        description={`确认删除「${pendingDelete?.name ?? ''}」吗？若它是当前默认引擎，会自动回退到 Google。`}
        cancelLabel="取消"
        actionLabel="删除"
        isActionLoading={deleting}
        onAction={() => void handleDelete()}
        width={420}
      />
    </SettingsSection>
  );
}

interface EngineRowProps {
  engine: SearchEngineConfig;
  isLastEngine: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/** 单行引擎：拖拽手柄 + 图标 + 名称 + URL + 编辑/删除按钮 */
function EngineRow({ engine, isLastEngine, onEdit, onDelete }: EngineRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: engine.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

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

      <EngineIcon engine={engine} size={20} />
      <VStack gap={0.5} className="flex-1 min-w-0">
        <Text size="sm" className="truncate">
          {engine.name}
        </Text>
        <Text size="2xs" color="secondary" className="truncate">
          {engine.urlTemplate}
        </Text>
      </VStack>

      <HStack gap={0.5}>
        <IconButton
          label="编辑"
          icon={<Pencil size={14} />}
          variant="ghost"
          size="sm"
          onClick={onEdit}
        />
        {!isLastEngine && (
          <IconButton
            label="删除"
            icon={<Trash2 size={14} />}
            variant="ghost"
            size="sm"
            onClick={onDelete}
          />
        )}
      </HStack>
    </div>
  );
}

/** 引擎图标：有 logo 用图片，否则回退地球图标 */
function EngineIcon({
  engine,
  size,
}: {
  engine: SearchEngineConfig;
  size: number;
}) {
  if (!engine.logo) {
    return <Globe size={size} className="shrink-0 text-secondary" />;
  }
  return (
    <Image
      src={engine.logo}
      alt={engine.name}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 object-contain"
    />
  );
}

interface EngineEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  engine: SearchEngineConfig | null;
  error: string | null;
  saving: boolean;
  pendingIconUpload: IconUploadSelection | null;
  onUploadSelectionChange: (selection: IconUploadSelection | null) => void;
  onSubmit: (form: EngineFormState) => void;
}

/** 新建/编辑自定义引擎 Modal */
function EngineEditModal({
  isOpen,
  onOpenChange,
  engine,
  error,
  saving,
  pendingIconUpload,
  onUploadSelectionChange,
  onSubmit,
}: EngineEditModalProps) {
  const [form, setForm] = useState<EngineFormState>(() =>
    engine
      ? {
          name: engine.name,
          urlTemplate: engine.urlTemplate,
          iconPath: engine.logo ?? '',
        }
      : EMPTY_ENGINE_FORM,
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
      width={440}
    >
      <form onSubmit={handleSubmit} className="contents">
        <Layout
          header={
            <DialogHeader
              title={engine ? `编辑引擎：${engine.name}` : '添加引擎'}
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <FormLayout direction="vertical">
                <VStack gap={1.5} width="100%" align="center">
                  <IconPicker
                    value={form.iconPath}
                    cardName={form.name}
                    onChange={(v) => setForm({ ...form, iconPath: v })}
                    uploadSelection={pendingIconUpload}
                    onUploadSelectionChange={onUploadSelectionChange}
                    disabled={saving}
                  />
                  <Text size="2xs" color="secondary">
                    从图标库选择或上传，留空显示地球图标
                  </Text>
                </VStack>

                <TextInput
                  label="名称"
                  placeholder="如：DuckDuckGo"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  isRequired
                  width="100%"
                />

                <TextInput
                  label="搜索 URL"
                  placeholder="https://duckduckgo.com/?q="
                  value={form.urlTemplate}
                  onChange={(v) => setForm({ ...form, urlTemplate: v })}
                  isRequired
                  width="100%"
                />
                <Text size="2xs" color="secondary">
                  搜索词会经 URL 编码后拼接在该地址末尾
                </Text>

                {error && (
                  <Text size="sm" className="text-danger">
                    {error}
                  </Text>
                )}
              </FormLayout>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} justify="end">
                <Button
                  label="取消"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                />
                <Button
                  label={engine ? '保存' : '添加'}
                  variant="primary"
                  size="sm"
                  type="submit"
                  isDisabled={saving}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
