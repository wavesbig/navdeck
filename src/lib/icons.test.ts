import {describe, it, expect} from 'vitest';
import {searchIcons, getIconUrl, loadManifest, type IconManifest} from './icons';

describe('loadManifest', () => {
  it('加载 manifest.json 并包含必需字段', async () => {
    const manifest = await loadManifest();
    expect(manifest).toHaveProperty('version');
    expect(manifest).toHaveProperty('cdnBase');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('缓存后第二次调用返回同一引用', async () => {
    const a = await loadManifest();
    const b = await loadManifest();
    expect(a).toBe(b);
  });

  it('每个图标条目都有 name / label / category', async () => {
    const manifest = await loadManifest();
    for (const entry of manifest.icons) {
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.category).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
    }
  });
});

describe('searchIcons', () => {
  it('空查询返回前 limit 个图标', async () => {
    const results = await searchIcons('', 5);
    expect(results.length).toBeLessThanOrEqual(5);
    expect(results.length).toBeGreaterThan(0);
  });

  it('按 name 子串匹配', async () => {
    const results = await searchIcons('jellyfin', 10);
    expect(results.some((e) => e.name === 'jellyfin')).toBe(true);
  });

  it('按 label 子串匹配', async () => {
    const results = await searchIcons('jelly', 10);
    expect(results.some((e) => e.label.toLowerCase().includes('jelly'))).toBe(true);
  });

  it('完全匹配 label 时得分最高，排在最前', async () => {
    // 用 label 完全匹配（不区分大小写）的查询
    const manifest = await loadManifest();
    const target = manifest.icons[0];
    const results = await searchIcons(target.label, 50);
    if (results.length > 0) {
      expect(results[0].label).toBe(target.label);
    }
  });

  it('无匹配时返回空数组', async () => {
    const results = await searchIcons('xyz_no_such_icon_xyz', 10);
    expect(results).toEqual([]);
  });
});

describe('getIconUrl', () => {
  it('拼接 CDN URL', () => {
    const manifest: IconManifest = {
      version: 1,
      source: 'test',
      sourceUrl: 'https://example.com',
      cdnBase: 'https://cdn.example.com/icons',
      icons: [],
    };
    expect(getIconUrl(manifest, 'jellyfin')).toBe(
      'https://cdn.example.com/icons/jellyfin.png'
    );
  });

  it('name 包含特殊字符时直接拼接（无编码）', () => {
    const manifest: IconManifest = {
      version: 1,
      source: 'test',
      sourceUrl: '',
      cdnBase: 'https://cdn.example.com',
      icons: [],
    };
    // 当前实现是字符串拼接，不做编码
    expect(getIconUrl(manifest, 'a-b')).toBe('https://cdn.example.com/a-b.png');
  });
});
