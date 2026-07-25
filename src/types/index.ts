// 全局共享类型定义

/** 网络模式（内外网切换） */
export type NetworkMode = 'auto' | 'internal' | 'external';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 搜索引擎 key */
export type SearchEngine = 'google' | 'bing' | 'baidu' | 'github' | 'stackoverflow';

/** Widget 栏布局（栏数） */
export type WidgetLayout = 1 | 2;

/** Widget key（4 种 widget） */
export type WidgetKey = 'nas-status' | 'resource-gauge' | 'countdown' | 'countup';

/** 日期项 widget key（倒数日 / 正数日） */
export type DateItemWidgetKey = 'countdown' | 'countup';

/** 卡片状态灯三态 */
export type CardStatus = 'online' | 'offline' | 'unknown';

/** 搜索引擎配置 */
export interface SearchEngineConfig {
  key: SearchEngine;
  name: string;
  /** 搜索 URL 模板，关键词会被 encodeURIComponent 处理后拼接 */
  urlTemplate: string;
  /** 引擎 logo 路径或字母标识 */
  logo?: string;
}

/** 5 个预置搜索引擎 */
export const SEARCH_ENGINES: SearchEngineConfig[] = [
  { key: 'google', name: 'Google', urlTemplate: 'https://www.google.com/search?q=' },
  { key: 'bing', name: 'Bing', urlTemplate: 'https://www.bing.com/search?q=' },
  { key: 'baidu', name: '百度', urlTemplate: 'https://www.baidu.com/s?wd=' },
  { key: 'github', name: 'GitHub', urlTemplate: 'https://github.com/search?q=' },
  { key: 'stackoverflow', name: 'Stack Overflow', urlTemplate: 'https://stackoverflow.com/search?q=' },
];

/** Docker 容器状态聚合（NasStatus widget 数据） */
export interface DockerStatusSummary {
  /** 运行中容器数 */
  running: number;
  /** 总容器数 */
  total: number;
  /** 已停止容器数 */
  stopped: number;
}

/** Docker 资源水位（ResourceGauge widget 数据） */
export interface DockerResourceSummary {
  /** 容器聚合 CPU 使用率（0-100） */
  cpuPercent: number;
  /** 容器聚合内存使用率（0-100） */
  memoryPercent: number;
  /** 容器聚合磁盘 IO 读速率（bytes/s） */
  diskReadBytesPerSec: number;
  /** 容器聚合磁盘 IO 写速率（bytes/s） */
  diskWriteBytesPerSec: number;
}

/** 卡片探测结果 */
export interface CardStatusResult {
  id: string;
  status: CardStatus;
}

/** 卡片拖拽重排项 */
export interface CardReorderItem {
  id: string;
  order: number;
  /** 跨分类拖拽时的新分类 id，null 表示归到未分类 */
  categoryId: string | null;
}

/** 分类拖拽重排项 */
export interface CategoryReorderItem {
  id: string;
  order: number;
}

/** 日期项（widget 内部数据） */
export interface DateItemInput {
  name: string;
  date: string; // ISO 日期字符串
  recurring?: boolean;
}

/** 内外网判断后的最终跳转 URL */
export interface ResolvedUrl {
  /** 实际跳转的 URL */
  url: string;
  /** 来源：internalUrl 或 externalUrl */
  source: 'internal' | 'external';
}

/** 卡片（前端使用的结构，对应 Prisma Card model） */
export interface Card {
  id: string;
  name: string;
  internalUrl: string;
  externalUrl: string;
  icon: string;
  description: string | null;
  categoryId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  /** 关联分类（仅 GET 请求时返回） */
  category?: Category | null;
}

/** 分类（前端使用的结构，对应 Prisma Category model） */
export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
  /** 关联卡片（仅 GET 请求时返回） */
  cards?: Card[];
}
