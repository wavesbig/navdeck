import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const targets = [
  {
    path: path.join(
      projectRoot,
      'node_modules',
      '@astryxdesign',
      'core',
      'dist',
      'Calendar',
      'hooks',
      'useCalendarDays.js',
    ),
    from: `const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const rotated = [];
    for (let i = 0; i < 7; i++) {
      rotated.push(names[(i + weekStartsOn) % 7]);
    }
    return rotated;`,
    to: `const formatter = new Intl.DateTimeFormat(typeof document === 'undefined' ? 'zh-CN' : document.documentElement.lang || 'zh-CN', {
      weekday: 'narrow',
      timeZone: 'UTC'
    });
    const names = [];
    for (let i = 0; i < 7; i++) {
      names.push(formatter.format(new Date(Date.UTC(2024, 0, 7 + i))));
    }
    const rotated = [];
    for (let i = 0; i < 7; i++) {
      rotated.push(names[(i + weekStartsOn) % 7]);
    }
    return rotated;`,
  },
];

let changed = false;

for (const target of targets) {
  const original = await readFile(target.path, 'utf8');

  if (original.includes(`weekday: 'narrow'`)) {
    continue;
  }

  if (!original.includes(target.from)) {
    throw new Error(`未找到可替换的 Astryx 星期头片段: ${target.path}`);
  }

  const patched = original.replace(target.from, target.to);
  await writeFile(target.path, patched, 'utf8');
  changed = true;
}

if (changed) {
  console.log('Patched Astryx calendar weekday labels.');
}
