import type { MetadataRoute } from 'next';
import { getBrandConfig } from '@/lib/brand';

export const dynamic = 'force-dynamic';

/** PWA manifest：站点名跟随品牌标题 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getBrandConfig();

  return {
    name: brand.title,
    short_name: brand.title,
    description: '自托管个人导航站',
    start_url: '/',
    display: 'standalone',
    background_color: '#17181B',
    theme_color: '#24272B',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/brand/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
