/**
 * 素材管理共享类型与工具函数
 */

export interface UploadedIcon {
  path: string;
  name: string;
  scope: 'cards' | 'library';
  size?: number;
  mtime?: string;
}

export interface PendingDelete {
  kind: 'icon' | 'image';
  key: string;
  name: string;
}

export interface BulkDeleteState {
  kind: 'icon' | 'image';
  keys: string[];
  names: string[];
  totalUsage: number;
}

export type ViewMode = 'grid' | 'list';
export type SortKey = 'name' | 'mtime';
export type TabKey = 'icon' | 'wallpaper';

export function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function sortAssets<T extends { name: string; mtime?: string }>(
  items: T[],
  key: SortKey,
): T[] {
  const arr = [...items];
  if (key === 'name')
    arr.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  else
    arr.sort((a, b) => {
      const ta = a.mtime ? new Date(a.mtime).getTime() : 0;
      const tb = b.mtime ? new Date(b.mtime).getTime() : 0;
      return tb - ta;
    });
  return arr;
}

export function filterByQuery<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => it.name.toLowerCase().includes(q));
}

export function getItemKey(item: { id?: string; path?: string }): string {
  return item.path ?? item.id ?? '';
}

export function bulkDeleteDescription(state: BulkDeleteState | null): string {
  if (!state) return '';
  const { kind, keys, names, totalUsage } = state;
  const head = names.slice(0, 3).join('、');
  const tail = names.length > 3 ? ` 等 ${names.length} 项` : '';
  if (kind === 'icon' && totalUsage > 0) {
    return `共 ${keys.length} 项（含「${head}」${tail}）。其中 ${totalUsage} 处引用会在删除后回退为首字母显示。此操作无法撤销。`;
  }
  return `共 ${keys.length} 项（含「${head}」${tail}）。此操作无法撤销。`;
}
export type { Wallpaper } from '@/types';
