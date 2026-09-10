import { describe, expect, it } from 'vitest';
import { parseChangelog } from './changelog';

describe('parseChangelog', () => {
  it('解析版本标题、日期、分类与条目', () => {
    const md = [
      '# 更新日志',
      '',
      '## v0.3.7 - 2026-09-10',
      '### 修复',
      '- 修复拖拽卡片误触发快速创建',
      '- 修复 S 卡内容贴边',
      '### 新增',
      '- 新增更新日志展示',
      '',
      '## v0.3.6 - 2026-09-10',
      '### 修复',
      '- 行高随字号缩放',
    ].join('\n');

    const releases = parseChangelog(md);

    expect(releases).toHaveLength(2);
    expect(releases[0].version).toBe('v0.3.7');
    expect(releases[0].date).toBe('2026-09-10');
    expect(releases[0].categories).toEqual([
      {
        name: '修复',
        items: ['修复拖拽卡片误触发快速创建', '修复 S 卡内容贴边'],
      },
      { name: '新增', items: ['新增更新日志展示'] },
    ]);
    expect(releases[1].version).toBe('v0.3.6');
    expect(releases[1].date).toBe('2026-09-10');
    expect(releases[1].categories[0].items).toEqual(['行高随字号缩放']);
  });

  it('容忍 CRLF、无日期标题与分类间的空行', () => {
    const md = [
      '## v1.0.0',
      '',
      '### 变更',
      '',
      '- 调整布局',
      '* 星号条目也算',
      '普通文本行被忽略',
    ].join('\r\n');

    const releases = parseChangelog(md);

    expect(releases).toHaveLength(1);
    expect(releases[0].date).toBeUndefined();
    expect(releases[0].categories[0].items).toEqual([
      '调整布局',
      '星号条目也算',
    ]);
  });

  it('无版本段落时返回空数组', () => {
    expect(parseChangelog('# 更新日志\n\n随便写点说明')).toEqual([]);
  });
});
