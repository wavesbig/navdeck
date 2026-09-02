import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * 图标库元数据加载与搜索
 *
 * 数据源：public/icons/manifest.json
 * 实际图标文件来自 public 本地静态资源
 */

export interface IconEntry {
  /** 图标文件名（不含扩展名），如 jellyfin */
  name: string;
  /** 显示名称，如 Jellyfin */
  label: string;
  /** 资源格式；未指定时默认 PNG */
  format?: 'svg' | 'png';
  /** 相对站点根目录的资源路径；优先于 assetBase 拼接 */
  path?: string;
}

export interface IconManifest {
  version: number;
  source: string;
  sourceUrl: string;
  sourceCommit?: string;
  license?: string;
  assetBase: string;
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
 * 解析图标本地 URL
 */
export function getIconUrl(manifest: IconManifest, name: string): string {
  const entry = manifest.icons.find((item) => item.name === name);
  if (entry?.path) return entry.path;

  const format = entry?.format ?? 'png';
  return `${manifest.assetBase}/${format}/${name}.${format}`;
}
