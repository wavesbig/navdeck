import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import {
  DEFAULT_QBITTORRENT_CONFIG,
  resetQbittorrentLoginState,
} from '@/lib/qbittorrent';
import { qbittorrentConfigSchema } from '@/lib/validation';
import type { QbittorrentConfig } from '@/types';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

/** GET 响应体：不回传密码明文 */
function toConfigView(config: QbittorrentConfig) {
  return {
    url: config.url,
    username: config.username,
    hasPassword: Boolean(config.password),
  };
}

/**
 * qBittorrent 集成配置读取 / 保存
 * - GET: 返回连接配置（密码脱敏，仅返回 hasPassword）
 * - PUT: 保存连接配置；password 为空时保留已存密码
 */
export const GET = withAuth(async () => {
  const config = await getUserPreference<QbittorrentConfig>(
    'qbittorrent',
    DEFAULT_QBITTORRENT_CONFIG,
  );
  return NextResponse.json(toConfigView(config), { headers: NO_STORE_HEADERS });
});

export const PUT = withAuth(async (_session, req) => {
  const parsed = validateBody(qbittorrentConfigSchema, await req.json());
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const current = await getUserPreference<QbittorrentConfig>(
    'qbittorrent',
    DEFAULT_QBITTORRENT_CONFIG,
  );
  // 密码留空 = 保持已存密码不变（编辑场景）；有值则覆盖
  const next: QbittorrentConfig = {
    url: body.url,
    username: body.username,
    password: body.password || current.password,
  };
  await setUserPreference('qbittorrent', next);
  // 新配置保存即重置登录退避，恢复自动重试通道
  resetQbittorrentLoginState();
  return NextResponse.json(toConfigView(next), { headers: NO_STORE_HEADERS });
});
