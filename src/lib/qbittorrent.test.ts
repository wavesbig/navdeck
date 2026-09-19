import { describe, expect, it } from 'vitest';
import {
  aggregateTorrents,
  extractSessionCookie,
  type QbTorrentRaw,
} from './qbittorrent';

const raw = (over: Partial<QbTorrentRaw>): QbTorrentRaw => ({
  dlspeed: 0,
  upspeed: 0,
  uploaded: 0,
  downloaded: 0,
  state: 'downloading',
  ...over,
});

describe('qBittorrent 聚合', () => {
  it('统计三类任务数与总速度', () => {
    const { summary } = aggregateTorrents([
      raw({ dlspeed: 1024, upspeed: 512, state: 'downloading' }),
      raw({ dlspeed: 2048, upspeed: 256, state: 'stalledDL' }),
      raw({ upspeed: 4096, state: 'uploading' }),
      raw({ state: 'pausedDL' }),
      raw({ state: 'stoppedUP' }),
      raw({ state: 'error' }),
    ]);
    expect(summary.downloadSpeed).toBe(3072);
    expect(summary.uploadSpeed).toBe(4864);
    expect(summary.downloading).toBe(2);
    expect(summary.seeding).toBe(1);
    expect(summary.paused).toBe(2);
  });

  it('空列表返回零值', () => {
    const { summary, lifetime } = aggregateTorrents([]);
    expect(summary.downloading).toBe(0);
    expect(summary.downloadSpeed).toBe(0);
    expect(lifetime.total).toBe(0);
  });

  it('统计全生命周期累计上传与下载', () => {
    const { lifetime } = aggregateTorrents([
      raw({ uploaded: 300, downloaded: 100 }),
      raw({ uploaded: 100, downloaded: 200 }),
    ]);
    expect(lifetime.uploaded).toBe(400);
    expect(lifetime.downloaded).toBe(300);
    expect(lifetime.total).toBe(2);
  });
});

describe('会话 Cookie 提取', () => {
  it('提取新版自定义名 Cookie（204 成功响应）', () => {
    expect(extractSessionCookie('QBT_SID_8888=abc123; path=/; HttpOnly')).toBe(
      'QBT_SID_8888=abc123',
    );
  });

  it('提取旧版 SID Cookie（200 "Ok." 响应）', () => {
    expect(extractSessionCookie('SID=xyz; path=/')).toBe('SID=xyz');
  });

  it('空 set-cookie 返回 null', () => {
    expect(extractSessionCookie('')).toBeNull();
  });
});
