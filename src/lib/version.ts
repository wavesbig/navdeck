import pkg from '../../package.json';

/** 应用版本号（package.json 单一来源，不含 v 前缀），用于设置页展示 */
export const APP_VERSION = pkg.version;

/** GitHub Releases 检测源（release.sh 发版后自动创建 Release） */
export const RELEASES_LATEST_URL =
  'https://api.github.com/repos/wavesbig/navdeck/releases/latest';

/** 解析 vX.Y.Z 版本号为 [major, minor, patch]，非法格式返回 null */
export function parseVersion(version: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** 语义化版本比较：a>b → 1，a<b → -1，相等 → 0；任一非法返回 null */
export function compareVersions(a: string, b: string): number | null {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

/** 判断 latest 是否比 current 更新（任一版本非法视为否，避免误报） */
export function isNewerVersion(current: string, latest: string): boolean {
  return compareVersions(current, latest) === -1;
}

export interface LatestRelease {
  tag: string;
  notes: string;
  url: string;
}

/**
 * 解析 GitHub Releases API 响应
 *
 * releases/latest 不含 draft / prerelease；tag 形如 v0.6.0，
 * 非常规 tag（含后缀等）返回 null，避免版本比较误报。
 */
export function parseLatestRelease(payload: unknown): LatestRelease | null {
  const data = payload as {
    tag_name?: unknown;
    body?: unknown;
    html_url?: unknown;
  } | null;
  if (
    !data ||
    typeof data.tag_name !== 'string' ||
    typeof data.body !== 'string' ||
    typeof data.html_url !== 'string'
  ) {
    return null;
  }
  if (!/^v\d+\.\d+\.\d+$/.test(data.tag_name)) return null;
  return { tag: data.tag_name, notes: data.body, url: data.html_url };
}
