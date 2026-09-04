'use client';

import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import {
  ArrowUpDown,
  Check,
  ImagePlus,
  LayoutGrid,
  List,
  Search,
  Shapes,
  Upload,
} from 'lucide-react';
import { useAssetsController } from '@/components/settings/assets/useAssetsController';
import { SettingsSection } from '@/components/settings/SettingsSection';
import type { Wallpaper } from '@/types';
import { EmptyState, GridContent, ListContent } from './assets/AssetsContent';
import { AssetsToolbar, BulkActionsBar } from './assets/AssetsToolbar';
import {
  type BulkDeleteState,
  type UploadedIcon,
} from './assets/assets-shared';

export type { UploadedIcon } from './assets/assets-shared';

interface AssetsManagerProps {
  icons: UploadedIcon[];
  wallpapers: Wallpaper[];
  appliedWallpaperId?: string | null;
  iconUsage?: Record<string, number>;
}

const EMPTY_ICON_USAGE: Record<string, number> = {};

/**
 * 素材管理器（展示组合层）
 *
 * 状态与处理逻辑集中在 useAssetsController；
 * 工具栏 / 批量操作条 / 内容区分别是独立的展示组件。
 */
export function AssetsManager({
  icons,
  wallpapers,
  appliedWallpaperId,
  iconUsage = EMPTY_ICON_USAGE,
}: AssetsManagerProps) {
  const isCompact = useMediaQuery('(max-width: 640px)');
  const ctl = useAssetsController({
    icons,
    wallpapers,
    appliedWallpaperId,
    iconUsage,
  });

  const typeControl = (
    <SegmentedControl
      value={ctl.tab}
      onChange={(v) => ctl.setTab(v as Parameters<typeof ctl.setTab>[0])}
      label="素材类型"
    >
      <SegmentedControlItem
        value="icon"
        label={`图标 ${icons.length}`}
        icon={<Shapes size={14} />}
      />
      <SegmentedControlItem
        value="wallpaper"
        label={`壁纸 ${wallpapers.length}`}
        icon={<ImagePlus size={14} />}
      />
    </SegmentedControl>
  );

  const searchInput = (
    <TextInput
      label="搜索文件名"
      isLabelHidden
      value={ctl.query}
      onChange={ctl.setQuery}
      placeholder="搜索文件名"
      startIcon={Search}
      hasClear
      width={isCompact ? '100%' : 160}
    />
  );

  const sortMenu = (
    <DropdownMenu
      button={{
        label: '排序',
        icon: <ArrowUpDown size={14} />,
        variant: 'ghost',
      }}
      items={[
        {
          id: 'name',
          label: '按名称',
          icon: ctl.sort === 'name' ? <Check size={14} /> : undefined,
          onClick: () => ctl.setSort('name'),
        },
        {
          id: 'mtime',
          label: '按修改时间',
          icon: ctl.sort === 'mtime' ? <Check size={14} /> : undefined,
          onClick: () => ctl.setSort('mtime'),
        },
      ]}
      menuWidth={140}
      hasChevron={false}
    />
  );

  const viewButton = (
    <IconButton
      label={ctl.view === 'grid' ? '切换到列表' : '切换到网格'}
      tooltip={ctl.view === 'grid' ? '切换到列表' : '切换到网格'}
      icon={ctl.view === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
      variant="ghost"
      onClick={() => ctl.setView(ctl.view === 'grid' ? 'list' : 'grid')}
    />
  );

  const uploadMenu = (
    <DropdownMenu
      button={{
        label: ctl.uploading ? '上传中…' : '上传',
        icon: <Upload size={14} />,
        variant: 'primary',
        size: 'sm',
      }}
      items={[
        {
          id: 'icon',
          label: '上传图标',
          icon: <Shapes size={14} />,
          onClick: () => ctl.iconUpload.open(),
        },
        {
          id: 'wallpaper',
          label: '上传壁纸',
          icon: <ImagePlus size={14} />,
          onClick: () => ctl.imageUpload.open(),
        },
      ]}
      menuWidth={160}
    />
  );

  return (
    <SettingsSection title="素材管理" description="已上传的卡片图标与壁纸文件">
      <VStack gap={5}>
        {/* 主工具栏常驻；批量操作独立出现，避免筛选上下文被替换 */}
        <AssetsToolbar
          isCompact={isCompact}
          typeControl={typeControl}
          searchInput={searchInput}
          sortMenu={sortMenu}
          viewButton={viewButton}
          uploadMenu={uploadMenu}
        />

        {ctl.hasSelection && (
          <BulkActionsBar
            isCompact={isCompact}
            selectedCount={ctl.currentSelection.size}
            allSelected={ctl.allSelected}
            onSelectAll={
              ctl.allSelected
                ? () => ctl.setCurrentSelection(new Set())
                : ctl.selectAllCurrent
            }
            onClear={() => ctl.setCurrentSelection(new Set())}
            onDelete={ctl.triggerBulkDelete}
          />
        )}
        {/* 搜索匹配统计（仅搜索时显示） */}
        {ctl.query.trim().length > 0 && !ctl.isEmpty && (
          <Text size="xsm" color="secondary" className="font-mono">
            匹配 {ctl.currentItems.length} / {ctl.currentTotal} 项
          </Text>
        )}

        {ctl.isEmpty ? (
          <EmptyState
            icon={
              ctl.isIconTab ? <Shapes size={16} /> : <ImagePlus size={16} />
            }
            label={ctl.isIconTab ? '还没有上传的图标' : '还没有上传的壁纸'}
            hint={
              ctl.isIconTab
                ? '支持 PNG / SVG / WebP / GIF / ICO'
                : '支持 PNG / JPEG / WebP'
            }
            onUpload={() =>
              ctl.isIconTab ? ctl.iconUpload.open() : ctl.imageUpload.open()
            }
            uploading={ctl.uploading}
          />
        ) : ctl.noMatch ? (
          <Text size="sm" color="secondary" className="py-10 text-center">
            没有匹配「{ctl.query}」的内容
          </Text>
        ) : ctl.view === 'grid' ? (
          <GridContent
            isIconTab={ctl.isIconTab}
            items={ctl.currentItems}
            selectedIcons={ctl.currentSelection}
            selectedWps={ctl.currentSelection}
            appliedWallpaperId={appliedWallpaperId}
            iconUsage={iconUsage}
            deleting={ctl.deleting}
            onToggleIcon={(p) => ctl.toggleSelection(p)}
            onToggleWp={(id) => ctl.toggleSelection(id)}
            onDeleteIcon={(p, n) =>
              ctl.setPendingDelete({ kind: 'icon', key: p, name: n })
            }
            onDeleteWp={(id, n) =>
              ctl.setPendingDelete({ kind: 'image', key: id, name: n })
            }
          />
        ) : (
          <ListContent
            isIconTab={ctl.isIconTab}
            items={ctl.currentItems}
            selectedIcons={ctl.currentSelection}
            selectedWps={ctl.currentSelection}
            appliedWallpaperId={appliedWallpaperId}
            iconUsage={iconUsage}
            deleting={ctl.deleting}
            onToggleIcon={(p) => ctl.toggleSelection(p)}
            onToggleWp={(id) => ctl.toggleSelection(id)}
            onDeleteIcon={(p, n) =>
              ctl.setPendingDelete({ kind: 'icon', key: p, name: n })
            }
            onDeleteWp={(id, n) =>
              ctl.setPendingDelete({ kind: 'image', key: id, name: n })
            }
          />
        )}

        {ctl.iconUpload.input}
        {ctl.imageUpload.input}

        <AlertDialog
          isOpen={ctl.pendingDelete !== null}
          onOpenChange={(o) => {
            if (!o && ctl.deleting === null) ctl.setPendingDelete(null);
          }}
          title={ctl.pendingDelete?.kind === 'icon' ? '删除图标' : '删除图片'}
          description={ctl.singleDeleteDescription}
          actionLabel="删除"
          cancelLabel="取消"
          isActionLoading={ctl.deleting !== null}
          onAction={() => void ctl.confirmDelete()}
        />

        <AlertDialog
          isOpen={ctl.bulkDelete !== null}
          onOpenChange={(o) => {
            if (!o && !ctl.bulkDeleting) ctl.setBulkDelete(null);
          }}
          title={`批量删除${ctl.bulkDelete?.kind === 'icon' ? '图标' : '图片'}`}
          description={bulkDeleteText(ctl.bulkDelete)}
          actionLabel={
            ctl.bulkDelete ? `删除 ${ctl.bulkDelete.keys.length} 项` : '删除'
          }
          cancelLabel="取消"
          isActionLoading={ctl.bulkDeleting}
          onAction={() => void ctl.confirmBulkDelete()}
        />
      </VStack>
    </SettingsSection>
  );
}

function bulkDeleteText(state: BulkDeleteState | null): string {
  return `批量删除${state?.kind === 'icon' ? '图标' : '图片'}`;
}
