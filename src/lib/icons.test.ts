import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getIconUrl, type IconManifest, loadManifest } from './icons';

describe('loadManifest', () => {
  it('加载 manifest.json 并包含必需字段', async () => {
    const manifest = await loadManifest();
    expect(manifest).toHaveProperty('version');
    expect(manifest.source).toBe('homarr-labs/dashboard-icons');
    expect(manifest.sourceUrl).toBe(
      'https://github.com/homarr-labs/dashboard-icons',
    );
    expect(manifest.assetBase).toBe('/icons/library');
    expect(manifest.sourceCommit).toBe(
      '1cdb6d737c3623705109fb8f4aee890adab58d3b',
    );
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('缓存后第二次调用返回同一引用', async () => {
    const a = await loadManifest();
    const b = await loadManifest();
    expect(a).toBe(b);
  });

  it('每个图标条目都有 name / label', async () => {
    const manifest = await loadManifest();
    for (const entry of manifest.icons) {
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.label).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
    }
  });
});

describe('getIconUrl', () => {
  it('拼接本地资源 URL', () => {
    const manifest: IconManifest = {
      version: 1,
      source: 'test',
      sourceUrl: 'https://example.com',
      assetBase: '/icons/library',
      icons: [],
    };
    expect(getIconUrl(manifest, 'jellyfin')).toBe(
      '/icons/library/png/jellyfin.png',
    );
  });

  it('name 包含特殊字符时直接拼接（无编码）', () => {
    const manifest: IconManifest = {
      version: 1,
      source: 'test',
      sourceUrl: '',
      assetBase: '/icons/library',
      icons: [],
    };
    // 当前实现是字符串拼接，不做编码
    expect(getIconUrl(manifest, 'a-b')).toBe('/icons/library/png/a-b.png');
  });

  it('优先使用 SVG 条目的本地路径', () => {
    const manifest: IconManifest = {
      version: 2,
      source: 'test',
      sourceUrl: '',
      assetBase: '/icons/library',
      icons: [
        {
          name: 'docker',
          label: 'Docker',
          format: 'svg',
          path: '/icons/docker/docker.svg',
        },
      ],
    };
    expect(getIconUrl(manifest, 'docker')).toBe('/icons/docker/docker.svg');
  });

  it('图标清单中的所有本地资源都存在', async () => {
    const manifest = await loadManifest();
    expect(manifest.icons.length).toBe(275);
    expect(
      manifest.icons.filter((entry) => (entry.format ?? 'png') === 'svg'),
    ).toHaveLength(275);
    expect(
      manifest.icons.filter((entry) => (entry.format ?? 'png') === 'png'),
    ).toHaveLength(0);

    for (const entry of manifest.icons) {
      const url = getIconUrl(manifest, entry.name);
      expect(url.startsWith('/icons/')).toBe(true);
      await expect(
        access(join(process.cwd(), 'public', url)),
      ).resolves.toBeUndefined();
    }
  });
});
