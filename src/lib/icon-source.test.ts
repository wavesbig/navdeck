import { describe, expect, it } from 'vitest';
import { getIconSource, getUploadedIconPath } from './icon-source';

describe('getIconSource', () => {
  it('identifies library, upload, link, manual and empty values', () => {
    expect(getIconSource('')).toBe('empty');
    expect(getIconSource('/icons/library/svg/jellyfin.svg')).toBe('library');
    expect(getIconSource('/api/icons/file?path=cards/uuid.png')).toBe('upload');
    expect(getIconSource('https://example.com/favicon.ico')).toBe('link');
    expect(getIconSource('Jellyfin')).toBe('manual');
  });
});

describe('getUploadedIconPath', () => {
  it('returns only safe card upload paths', () => {
    expect(getUploadedIconPath('/api/icons/file?path=cards/uuid.png')).toBe(
      'cards/uuid.png',
    );
    expect(getUploadedIconPath('/icons/library/svg/jellyfin.svg')).toBeNull();
    expect(
      getUploadedIconPath('/api/icons/file?path=../secret.png'),
    ).toBeNull();
  });
});
