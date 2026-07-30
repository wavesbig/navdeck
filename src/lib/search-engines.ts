import type { SearchEngineConfig } from '@/types';

/** 5 个预置搜索引擎
 *  logo 来源：
 *  - Dashboard Icons（homarr-labs/dashboard-icons 仓库 via jsDelivr CDN）
 *    https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/{slug}.png
 *  - Stack Overflow 不在 Dashboard Icons，fallback 用 Simple Icons
 *    https://cdn.simpleicons.org/stackoverflow
 */
export const SEARCH_ENGINES: SearchEngineConfig[] = [
  {
    key: 'google',
    name: 'Google',
    urlTemplate: 'https://www.google.com/search?q=',
    logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/google.png',
  },
  {
    key: 'bing',
    name: 'Bing',
    urlTemplate: 'https://www.bing.com/search?q=',
    logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/bing.png',
  },
  {
    key: 'baidu',
    name: '百度',
    urlTemplate: 'https://www.baidu.com/s?wd=',
    logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/baidu.png',
  },
  {
    key: 'github',
    name: 'GitHub',
    urlTemplate: 'https://github.com/search?q=',
    logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/github.png',
  },
  {
    key: 'stackoverflow',
    name: 'Stack Overflow',
    urlTemplate: 'https://stackoverflow.com/search?q=',
    logo: 'https://cdn.simpleicons.org/stackoverflow',
  },
];
