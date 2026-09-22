'use client';

import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { TextInput } from '@astryxdesign/core/TextInput';
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
import { AssetsToolbar } from '@/components/settings/assets/AssetsToolbar';
import { useAssetsController } from '@/components/settings/assets/useAssetsController';

interface AssetsControlsProps {
  ctl: ReturnType<typeof useAssetsController>;
  isCompact: boolean;
  icons: unknown[];
  wallpapers: unknown[];
}

/** 素材工具栏控件组装（类型/搜索/排序/视图/上传），从主组件拆出 */
export function AssetsControls({
  ctl,
  isCompact,
  icons,
  wallpapers,
}: AssetsControlsProps) {
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
    <AssetsToolbar
      isCompact={isCompact}
      typeControl={typeControl}
      searchInput={searchInput}
      sortMenu={sortMenu}
      viewButton={viewButton}
      uploadMenu={uploadMenu}
    />
  );
}
