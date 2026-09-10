/**
 * CHANGELOG.md 解析（发布更新日志的唯一事实源）
 *
 * 结构约定（Keep a Changelog 中文变体）：
 *
 *   # 更新日志
 *
 *   ## v0.3.7 - 2026-09-10
 *   ### 修复
 *   - 修复 xxx
 *   ### 新增
 *   - 新增 yyy
 *
 * 被 scripts/generate-changelog.ts 在构建期转成 JSON 供前端展示；
 * release.sh 提取对应版本段落作为 GitHub Release 说明。
 */

export interface ChangelogCategory {
  /** 分类名：新增 / 修复 / 变更 等 */
  name: string;
  items: string[];
}

export interface ChangelogRelease {
  /** 版本号，如 v0.3.7 */
  version: string;
  /** 发布日期（YYYY-MM-DD），缺省 undefined */
  date?: string;
  categories: ChangelogCategory[];
}

export interface ChangelogFile {
  currentVersion: string;
  releases: ChangelogRelease[];
}

/** 解析 Keep a Changelog 格式的更新日志 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let current: ChangelogRelease | null = null;
  let category: ChangelogCategory | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();

    const heading = /^## (v[\d.]+)(?:\s*-\s*(\d{4}-\d{2}-\d{2}))?\s*$/.exec(
      line,
    );
    if (heading) {
      current = {
        version: heading[1],
        ...(heading[2] ? { date: heading[2] } : {}),
        categories: [],
      };
      releases.push(current);
      category = null;
      continue;
    }
    if (!current) continue;

    const categoryMatch = /^###\s+(.+?)\s*$/.exec(line);
    if (categoryMatch) {
      category = { name: categoryMatch[1], items: [] };
      current.categories.push(category);
      continue;
    }
    if (!category) continue;

    const item = /^[-*]\s+(.+?)\s*$/.exec(line);
    if (item) {
      category.items.push(item[1]);
    }
  }

  return releases;
}
