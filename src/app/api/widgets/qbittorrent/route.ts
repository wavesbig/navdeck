import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import {
  DEFAULT_QBITTORRENT_CONFIG,
  fetchQbittorrentStats,
} from '@/lib/qbittorrent';
import { getUserPreference } from '@/lib/preferences';
import type { QbittorrentConfig, QbittorrentStats } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

const EMPTY_SUMMARY = {
  downloadSpeed: 0,
  uploadSpeed: 0,
  downloading: 0,
  seeding: 0,
  paused: 0,
};

const EMPTY_LIFETIME = { uploaded: 0, downloaded: 0, total: 0 };

/** 不可用响应：widget 直接展示 error 原因 */
function unavailable(error: string) {
  const body: QbittorrentStats = {
    available: false,
    error,
    summary: EMPTY_SUMMARY,
    lifetime: EMPTY_LIFETIME,
  };
  return NextResponse.json(body, { headers: NO_STORE_HEADERS });
}

/**
 * qBittorrent widget 数据 API
 * - GET: 读取集成配置并聚合 qB 下载状态；未配置 / 连接失败降级返回
 */
export const GET = withAuth(async (_session, req) => {
  const force = new URL(req.url).searchParams.get('force') === '1';
  const config = await getUserPreference<QbittorrentConfig>(
    'qbittorrent',
    DEFAULT_QBITTORRENT_CONFIG,
  );
  if (!config.url) {
    return unavailable('未配置，请右键 widget 填写连接信息');
  }
  try {
    return NextResponse.json(await fetchQbittorrentStats(config, force), {
      headers: NO_STORE_HEADERS,
    });
  } catch (e) {
    return unavailable(e instanceof Error ? e.message : 'qBittorrent 不可用');
  }
});
