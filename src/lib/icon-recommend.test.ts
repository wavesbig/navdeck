import { describe, expect, it } from 'vitest';
import { getIconRecommendations } from './icon-recommend';

const icons = [
  { name: 'jellyfin', label: 'Jellyfin' },
  { name: 'grafana', label: 'Grafana' },
  { name: 'uptime-kuma', label: 'Uptime Kuma' },
  { name: 'home-assistant', label: 'Home Assistant' },
];

describe('getIconRecommendations', () => {
  it('recommends the icon matching the service subdomain', () => {
    const results = getIconRecommendations(
      icons,
      undefined,
      'https://jellyfin.example.cn:8096/web/',
    );

    expect(results[0]).toEqual(icons[0]);
  });

  it('recommends the icon matching the card name', () => {
    const results = getIconRecommendations(
      icons,
      'Home Assistant',
      'http://192.168.1.10:8123',
    );

    expect(results[0]).toEqual(icons[3]);
  });

  it('returns nothing without matching terms', () => {
    const results = getIconRecommendations(icons, '随机文档', undefined, 3);

    expect(results).toHaveLength(0);
  });
});
