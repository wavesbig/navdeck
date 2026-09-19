import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getUserPreference } from '@/lib/preferences';
import { DEFAULT_QBITTORRENT_CONFIG } from '@/lib/qbittorrent';
import type { QbittorrentConfig } from '@/types';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

/**
 * qBittorrent 集成配置读取
 * - GET: 返回当前连接配置（添加 widget 时判断是否需要就地配置）
 */
export const GET = withAuth(async () => {
  const config = await getUserPreference<QbittorrentConfig>(
    'qbittorrent',
    DEFAULT_QBITTORRENT_CONFIG,
  );
  return NextResponse.json(config, { headers: NO_STORE_HEADERS });
});
