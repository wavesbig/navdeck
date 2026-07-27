import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { match } from 'pinyin-pro';

/**
 * 图标库元数据加载与搜索
 *
 * 数据源：public/icons/manifest.json
 * 实际图标文件通过 CDN（jsdelivr）按需拉取
 */

export interface IconEntry {
  /** 图标文件名（不含扩展名），如 jellyfin */
  name: string;
  /** 显示名称，如 Jellyfin */
  label: string;
  /** 分类标签，如「媒体」 */
  category: string;
}

export interface IconManifest {
  version: number;
  source: string;
  sourceUrl: string;
  cdnBase: string;
  icons: IconEntry[];
}

let cachedManifest: IconManifest | null = null;

/**
 * 加载 manifest.json
 *
 * 在服务端运行时从 public/icons/manifest.json 读取
 * 缓存到模块变量避免重复 IO
 */
export async function loadManifest(): Promise<IconManifest> {
  if (cachedManifest) return cachedManifest;

  const filePath = join(process.cwd(), 'public', 'icons', 'manifest.json');
  const content = await readFile(filePath, 'utf-8');
  cachedManifest = JSON.parse(content) as IconManifest;
  return cachedManifest;
}

/**
 * 根据查询关键词搜索图标
 *
 * 匹配维度：
 * 1. name 子串匹配（不区分大小写）
 * 2. label 子串匹配
 * 3. label 拼音匹配（含首字母缩写）
 *
 * @param query 查询关键词，空字符串返回全部
 * @param limit 最大返回数量，默认 50
 */
export async function searchIcons(
  query: string,
  limit = 50,
): Promise<IconEntry[]> {
  const manifest = await loadManifest();
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return manifest.icons.slice(0, limit);
  }

  const results: Array<{ entry: IconEntry; score: number }> = [];

  for (const entry of manifest.icons) {
    let score = 0;

    // name 子串匹配
    if (entry.name.toLowerCase().includes(trimmed)) {
      score += 3;
    }

    // label 子串匹配
    const labelLower = entry.label.toLowerCase();
    if (labelLower.includes(trimmed)) {
      score += 2;
      // 完全相等加分
      if (labelLower === trimmed) {
        score += 5;
      }
      // 前缀匹配加分
      if (labelLower.startsWith(trimmed)) {
        score += 1;
      }
    }

    // 拼音匹配（中文转拼音后比对）
    if (match(entry.label, query, { precision: 'any' })) {
      score += 2;
    }
    // 首字母缩写匹配
    if (match(entry.label, query, { precision: 'start' })) {
      score += 1;
    }

    if (score > 0) {
      results.push({ entry, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}

/**
 * 根据 icon name 拼接 CDN URL
 */
export function getIconUrl(manifest: IconManifest, name: string): string {
  return `${manifest.cdnBase}/${name}.png`;
}
