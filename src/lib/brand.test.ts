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
