// 全局共享类型定义

/** 网络模式（内外网切换） */
export type NetworkMode = 'auto' | 'internal' | 'external';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 搜索引擎 key */
export type SearchEngine =
  | 'google'
  | 'bing'
  | 'baidu'
  | 'github'
  | 'stackoverflow';

/** Widget 栏布局（栏数） */
export type WidgetLayout = 1 | 2;

/** Widget key（4 种 widget） */
export type WidgetKey =
  | 'nas-status'
  | 'resource-gauge'
  | 'countdown'
  | 'countup';

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
  /** 引擎 logo URL
   *  主用 Dashboard Icons CDN（彩色 PNG，self-hosted 导航站标准来源）
   *  Stack Overflow 不在 Dashboard Icons 仓库，fallback 用 Simple Icons CDN
   */
  logo: string;
}

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

/** 日期项（持久化记录，含 id 和 widgetKey） */
export interface DateItem extends DateItemInput {
  id: string;
  widgetKey: 'countdown' | 'countup';
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
  /** Lucky 同步状态（仅当卡片由 Lucky 同步创建时存在） */
  lucky?: CardLuckyState | null;
}

/**
 * Card.lucky 字段结构
 *
 * 仅当卡片由 Lucky 同步创建时存在，用于同步状态跟踪：
 * - ruleId：Lucky 规则唯一标识（rule:subRule 格式），应用层去重
 * - missing：Lucky 侧已删除此规则时置 true，卡片保留但标记失效
 * - syncedAt：上次同步时间（ISO 字符串），用于显示
 */
export interface CardLuckyState {
  /** Lucky 规则唯一标识（rule:subRule 格式） */
  ruleId: string;
  /** Lucky 侧是否已删除此规则（true = 失效，保留卡片但标记） */
  missing: boolean;
  /** 上次同步时间（ISO 字符串） */
  syncedAt: string;
}

/**
 * Lucky 同步配置（存 UserPreference key="lucky"）
 *
 * 收拢为单对象方便维护，避免散落多个 key。
 * 设置页表单读写整个对象。
 */
export interface LuckyConfig {
  /** 是否启用 Lucky 同步（开关） */
  enabled: boolean;
  /** Lucky 后台地址（内网 http://ip:port 或域名 https://xxx.com） */
  baseUrl: string;
  /** OpenToken（Lucky 后台 → 设置 → 最底部启用后获取） */
  openToken: string;
  /** 新卡片默认分类（null = 未分类） */
  defaultCategoryId: string | null;
  /** 用户在 NavDeck 删过的 ruleId 列表，同步时永久跳过 */
  deletedRuleIds: string[];
  /** 上次同步时间（ISO 字符串），用于设置页显示 */
  lastSyncAt: string | null;
}

/** Lucky 同步结果（同步 API 响应体，纯类型，client/server 共享） */
export interface LuckySyncResult {
  /** 新建的卡片数 */
  created: number;
  /** 更新地址的卡片数（含复活） */
  updated: number;
  /** 标记失效的卡片数（Lucky 侧已删除） */
  markedMissing: number;
  /** 跳过的规则数（在 deletedRuleIds 里） */
  skipped: number;
  /** 本次同步的错误信息（部分失败时收集） */
  errors: string[];
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

/** 壁纸来源 */
export type WallpaperSource = 'preset' | 'upload';

/** 壁纸（前端使用的结构，对应 Prisma Wallpaper model）
 *
 *  一张图适配两种主题（light/dark 共用，靠遮罩调整可读性），
 *  因此不区分 theme 字段。
 */
export interface Wallpaper {
  id: string;
  name: string;
  source: WallpaperSource;
  /** 预设为 /wallpapers/xxx.jpg，上传为 /api/wallpapers/file?path=xxx.jpg */
  path: string;
  /** 缩略图路径（可选） */
  thumbnail: string | null;
  createdAt: string;
}

/** 壁纸偏好（指向单个 Wallpaper.id，light/dark 共用） */
export interface WallpaperPreferences {
  /** 当前使用的壁纸 id（null = 不使用壁纸，回退到主题默认背景色） */
  wallpaper: string | null;
}
