/**
 * 构建期把 CHANGELOG.md 转成 JSON 供前端展示
 *
 * - 读取 CHANGELOG.md（唯一事实源）与 package.json 当前版本
 * - 写出 src/lib/changelog.generated.json（提交入库，前端直接 import）
 *
 * 由 npm run build / release.sh / predev 触发，CHANGELOG.md 变更后
 * 重新生成即可保持应用内展示同步。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseChangelog } from '../src/lib/changelog';

const root = resolve(import.meta.dirname, '..');
const markdown = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
const { version } = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8'),
) as { version: string };

const payload = {
  currentVersion: `v${version}`,
  releases: parseChangelog(markdown),
};

const out = resolve(root, 'src/lib/changelog.generated.json');
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `changelog.generated.json: ${payload.releases.length} 个版本，当前 ${payload.currentVersion}`,
);
