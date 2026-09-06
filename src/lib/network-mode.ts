import { Globe, type LucideIcon, Server, Wand2 } from 'lucide-react';
import type { NetworkMode } from '@/types';

/**
 * 网络模式元数据（单一来源）
 *
 * 右上角工具栏切换按钮与设置页网络模式选择共用，
 * 避免图标 / 文案在两处各自维护产生漂移。
 */
export const NETWORK_MODE_ORDER: NetworkMode[] = [
  'auto',
  'internal',
  'external',
];

export const NETWORK_MODE_META: Record<
  NetworkMode,
  { label: string; description: string; Icon: LucideIcon }
> = {
  auto: {
    label: '自动',
    description: '按可达性探测',
    Icon: Wand2,
  },
  internal: {
    label: '内网',
    description: '始终使用内网 URL',
    Icon: Server,
  },
  external: {
    label: '外网',
    description: '始终使用外网 URL',
    Icon: Globe,
  },
};

/** 网络模式变更事件名（FloatingToolbar ↔ NetworkForm ↔ useCardStatuses） */
export const NETWORK_MODE_CHANGE_EVENT = 'network-mode-change';
