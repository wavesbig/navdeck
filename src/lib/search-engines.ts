import type { SearchEngineConfig } from '@/types';

/** 5 个预置搜索引擎
 *  logo 来源：
 *  - Dashboard Icons 本地 SVG：/icons/library/svg/{slug}.svg
 *  - Stack Overflow 不在 Dashboard Icons，fallback 用 Simple Icons
 *    https://cdn.simpleicons.org/stackoverflow
 */
export const SEARCH_ENGINES: SearchEngineConfig[] = [
  {
    key: 'google',
    name: 'Google',
    urlTemplate: 'https://www.google.com/search?q=',
    logo: '/icons/library/svg/google.svg',
  },
  {
    key: 'bing',
    name: 'Bing',
    urlTemplate: 'https://www.bing.com/search?q=',
    logo: '/icons/library/svg/bing.svg',
  },
  {
    key: 'baidu',
    name: '百度',
    urlTemplate: 'https://www.baidu.com/s?wd=',
    logo: '/icons/library/svg/baidu.svg',
  },
  {
    key: 'github',
    name: 'GitHub',
    urlTemplate: 'https://github.com/search?q=',
    logo: '/icons/library/svg/github.svg',
  },
  {
    key: 'stackoverflow',
    name: 'Stack Overflow',
    urlTemplate: 'https://stackoverflow.com/search?q=',
    logo: 'https://cdn.simpleicons.org/stackoverflow',
  },
];
