import { describe, expect, it } from 'vitest';
import { validatePreferenceValue } from './validation';

describe('brand preference', () => {
  it('接受标题与上传路径或 http(s) Logo', () => {
    expect(
      validatePreferenceValue('brand', {
        title: ' Waves NAS ',
        logo: '/api/icons/file?path=brand/logo.png',
      }),
    ).toBe(true);
    expect(
      validatePreferenceValue('brand', {
        title: 'Waves NAS',
        logo: 'https://example.com/logo.png',
      }),
    ).toBe(true);
  });

  it('接受显隐开关，旧数据缺省字段也通过', () => {
    expect(
      validatePreferenceValue('brand', {
        title: 'Waves NAS',
        logo: '',
        showLogo: false,
        showTitle: false,
      }),
    ).toBe(true);
    // 旧数据无显隐字段，靠 schema 默认值兜底
    expect(
      validatePreferenceValue('brand', { title: 'Waves NAS', logo: '' }),
    ).toBe(true);
  });

  it('拒绝空标题与非 http(s) Logo 地址', () => {
    expect(
      validatePreferenceValue('brand', {
        title: '',
        logo: '',
      }),
    ).toBe(false);
    expect(
      validatePreferenceValue('brand', {
        title: 'Waves NAS',
        logo: 'file:///etc/passwd',
      }),
    ).toBe(false);
  });
});
