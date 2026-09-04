'use client';

import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Toolbar } from '@astryxdesign/core/Toolbar';
import { VStack } from '@astryxdesign/core/VStack';
import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface AssetsToolbarProps {
  isCompact: boolean;
  typeControl: ReactNode;
  searchInput: ReactNode;
  sortMenu: ReactNode;
  viewButton: ReactNode;
  uploadMenu: ReactNode;
}

/** 筛选工具栏：类型切换 + 搜索 + 排序 + 视图 + 上传（紧凑屏堆叠，宽屏单行） */
export function AssetsToolbar({
  isCompact,
  typeControl,
  searchInput,
  sortMenu,
  viewButton,
  uploadMenu,
}: AssetsToolbarProps) {
  if (isCompact) {
    return (
      <VStack gap={2} width="100%" role="toolbar" aria-label="素材筛选与视图">
        <HStack width="100%" vAlign="center" className="shrink-0">
          {typeControl}
        </HStack>
        {searchInput}
        <HStack gap={2} justify="between" width="100%" vAlign="center">
          {sortMenu}
          {viewButton}
          {uploadMenu}
        </HStack>
      </VStack>
    );
  }
  return (
    <HStack
      role="toolbar"
      aria-label="素材筛选与视图"
      gap={2}
      wrap="wrap"
      hAlign="between"
      vAlign="center"
      width="100%"
    >
      <HStack width={210} vAlign="center" className="shrink-0">
        {typeControl}
      </HStack>
      <HStack gap={2} wrap="wrap" justify="end" vAlign="center">
        {searchInput}
        {sortMenu}
        {viewButton}
        {uploadMenu}
      </HStack>
    </HStack>
  );
}

interface BulkActionsBarProps {
  isCompact: boolean;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
}

/** 批量操作条：选中素材后替换筛选工具栏 */
export function BulkActionsBar({
  isCompact,
  selectedCount,
  allSelected,
  onSelectAll,
  onClear,
  onDelete,
}: BulkActionsBarProps) {
  return (
    <Toolbar
      label="批量操作"
      size="sm"
      variant="muted"
      startContent={
        isCompact ? (
          <VStack gap={2} width="100%">
            <Text size="sm" weight="medium" color="accent">
              已选 {selectedCount} 项
            </Text>
            <HStack gap={2} justify="between" width="100%" vAlign="center">
              <Button
                label={allSelected ? '取消选择' : '全选'}
                variant="ghost"
                onClick={onSelectAll}
              />
              <Button label="清空" variant="ghost" onClick={onClear} />
            </HStack>
            <Button
              label={`删除 ${selectedCount} 项`}
              variant="destructive"
              icon={<Trash2 size={14} />}
              width="100%"
              onClick={onDelete}
            />
          </VStack>
        ) : (
          <HStack
            gap={2}
            wrap="wrap"
            hAlign="between"
            vAlign="center"
            width="100%"
          >
            <HStack gap={2} wrap="wrap" vAlign="center">
              <Text size="sm" weight="medium" color="accent">
                已选 {selectedCount} 项
              </Text>
              <Button
                label={allSelected ? '取消选择' : '全选'}
                variant="ghost"
                onClick={onSelectAll}
              />
              <Button label="清空" variant="ghost" onClick={onClear} />
            </HStack>
            <Button
              label={`删除 ${selectedCount} 项`}
              variant="destructive"
              icon={<Trash2 size={14} />}
              onClick={onDelete}
            />
          </HStack>
        )
      }
    />
  );
}
