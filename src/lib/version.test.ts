import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  isNewerVersion,
  parseLatestRelease,
  parseVersion,
} from './version';

describe('parseVersion', () => {
  it('解析带 v 前缀与裸版本号', () => {
    expect(parseVersion('v0.6.0')).toEqual([0, 6, 0]);
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
  });

  it('非法格式返回 null', () => {
    expect(parseVersion('v1.2')).toBeNull();
    expect(parseVersion('v1.2.3-beta')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });
});

describe('compareVersions / isNewerVersion', () => {
  it('逐段比较主次修订号', () => {
    expect(compareVersions('v0.6.0', 'v0.7.0')).toBe(-1);
    expect(compareVersions('v0.10.0', 'v0.9.0')).toBe(1);
    expect(compareVersions('v0.6.0', 'v0.6.0')).toBe(0);
  });

  it('isNewerVersion 严格大于才返回 true', () => {
    expect(isNewerVersion('v0.6.0', 'v0.7.0')).toBe(true);
    expect(isNewerVersion('v0.7.0', 'v0.6.0')).toBe(false);
    expect(isNewerVersion('v0.6.0', 'v0.6.0')).toBe(false);
  });

  it('任一版本非法视为非更新，避免误报', () => {
    expect(isNewerVersion('v0.6.0', 'v1.0.0-beta.1')).toBe(false);
    expect(isNewerVersion('dev', 'v1.0.0')).toBe(false);
  });
});

describe('parseLatestRelease', () => {
  it('解析标准响应', () => {
    expect(
      parseLatestRelease({
        tag_name: 'v0.7.0',
        body: '### 新增\n- xxx',
        html_url: 'https://github.com/wavesbig/navdeck/releases/tag/v0.7.0',
      }),
    ).toEqual({
      tag: 'v0.7.0',
      notes: '### 新增\n- xxx',
      url: 'https://github.com/wavesbig/navdeck/releases/tag/v0.7.0',
    });
  });

  it('缺字段或非常规 tag 返回 null', () => {
    expect(parseLatestRelease(null)).toBeNull();
    expect(parseLatestRelease({ tag_name: 'v0.7.0' })).toBeNull();
    expect(
      parseLatestRelease({ tag_name: 'nightly', body: '', html_url: '' }),
    ).toBeNull();
  });
});
