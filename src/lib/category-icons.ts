import {
  Antenna,
  Archive,
  ArrowDownToLine,
  Bell,
  Bookmark,
  Bug,
  Calendar,
  Camera,
  Cloud,
  CloudDownload,
  Code,
  Cpu,
  Database,
  Download,
  Eye,
  File,
  Files,
  FileText,
  Film,
  Flag,
  Folder,
  FolderOpen,
  Gauge,
  GitBranch,
  Globe,
  Hammer,
  HardDriveDownload,
  Headphones,
  Heart,
  House,
  Image,
  Key,
  Layers,
  Lock,
  type LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Mic,
  Music,
  Network,
  Package,
  Palette,
  Phone,
  Play,
  Podcast,
  Router,
  Satellite,
  ScanFace,
  Server,
  Settings,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Tag,
  Terminal,
  Tv,
  Users,
  Video,
  Wallet,
  Wifi,
  Wrench,
} from 'lucide-react';

/**
 * 分类图标清单
 *
 * - DB 存 kebab-case 名（如 'film'）
 * - 渲染时查 ICON_MAP 获取组件
 * - 精选 66 个常用分类图标，按业务场景分组
 */

export interface CategoryIconDef {
  /** kebab-case 名，存 DB */
  name: string;
  /** 显示名（中文） */
  label: string;
  /** 分组 */
  group: string;
}

export const CATEGORY_ICONS: CategoryIconDef[] = [
  // 媒体
  { name: 'film', label: '电影', group: '媒体' },
  { name: 'music', label: '音乐', group: '媒体' },
  { name: 'tv', label: '电视', group: '媒体' },
  { name: 'headphones', label: '耳机', group: '媒体' },
  { name: 'camera', label: '相机', group: '媒体' },
  { name: 'image', label: '图片', group: '媒体' },
  { name: 'video', label: '视频', group: '媒体' },
  { name: 'mic', label: '麦克风', group: '媒体' },
  { name: 'play', label: '播放', group: '媒体' },
  { name: 'podcast', label: '播客', group: '媒体' },

  // 下载
  { name: 'download', label: '下载', group: '下载' },
  { name: 'cloud-download', label: '云下载', group: '下载' },
  { name: 'hard-drive-download', label: '硬盘下载', group: '下载' },
  { name: 'arrow-down-to-line', label: '下载到行', group: '下载' },

  // 网络
  { name: 'globe', label: '全球', group: '网络' },
  { name: 'wifi', label: 'WiFi', group: '网络' },
  { name: 'network', label: '网络', group: '网络' },
  { name: 'server', label: '服务器', group: '网络' },
  { name: 'router', label: '路由器', group: '网络' },
  { name: 'cloud', label: '云', group: '网络' },
  { name: 'satellite', label: '卫星', group: '网络' },
  { name: 'antenna', label: '天线', group: '网络' },

  // 开发
  { name: 'code', label: '代码', group: '开发' },
  { name: 'git-branch', label: '分支', group: '开发' },
  { name: 'terminal', label: '终端', group: '开发' },
  { name: 'database', label: '数据库', group: '开发' },
  { name: 'cpu', label: 'CPU', group: '开发' },
  { name: 'bug', label: 'Bug', group: '开发' },
  { name: 'package', label: '包', group: '开发' },

  // 文件
  { name: 'file', label: '文件', group: '文件' },
  { name: 'folder', label: '文件夹', group: '文件' },
  { name: 'file-text', label: '文本文档', group: '文件' },
  { name: 'archive', label: '归档', group: '文件' },
  { name: 'files', label: '多文件', group: '文件' },
  { name: 'folder-open', label: '打开的文件夹', group: '文件' },

  // 工具
  { name: 'settings', label: '设置', group: '工具' },
  { name: 'wrench', label: '扳手', group: '工具' },
  { name: 'hammer', label: '锤子', group: '工具' },
  { name: 'sliders-horizontal', label: '滑块', group: '工具' },
  { name: 'gauge', label: '仪表', group: '工具' },

  // 社交
  { name: 'message-circle', label: '消息', group: '社交' },
  { name: 'mail', label: '邮件', group: '社交' },
  { name: 'users', label: '用户', group: '社交' },
  { name: 'phone', label: '电话', group: '社交' },
  { name: 'messages-square', label: '消息组', group: '社交' },

  // 安全
  { name: 'lock', label: '锁', group: '安全' },
  { name: 'key', label: '钥匙', group: '安全' },
  { name: 'shield', label: '盾牌', group: '安全' },
  { name: 'eye', label: '眼睛', group: '安全' },
  { name: 'scan-face', label: '人脸', group: '安全' },

  // 生活
  { name: 'house', label: '家', group: '生活' },
  { name: 'calendar', label: '日历', group: '生活' },
  { name: 'map-pin', label: '位置', group: '生活' },
  { name: 'shopping-bag', label: '购物', group: '生活' },
  { name: 'wallet', label: '钱包', group: '生活' },

  // 其他
  { name: 'star', label: '星标', group: '其他' },
  { name: 'heart', label: '心', group: '其他' },
  { name: 'bookmark', label: '书签', group: '其他' },
  { name: 'tag', label: '标签', group: '其他' },
  { name: 'flag', label: '旗帜', group: '其他' },
  { name: 'bell', label: '铃铛', group: '其他' },
  { name: 'palette', label: '调色板', group: '其他' },
  { name: 'layers', label: '图层', group: '其他' },
];

/** kebab-case → 组件映射 */
export const ICON_MAP: Record<string, LucideIcon> = {
  film: Film,
  music: Music,
  tv: Tv,
  headphones: Headphones,
  camera: Camera,
  image: Image,
  video: Video,
  mic: Mic,
  play: Play,
  podcast: Podcast,
  download: Download,
  'cloud-download': CloudDownload,
  'hard-drive-download': HardDriveDownload,
  'arrow-down-to-line': ArrowDownToLine,
  globe: Globe,
  wifi: Wifi,
  network: Network,
  server: Server,
  router: Router,
  cloud: Cloud,
  satellite: Satellite,
  antenna: Antenna,
  code: Code,
  'git-branch': GitBranch,
  terminal: Terminal,
  database: Database,
  cpu: Cpu,
  bug: Bug,
  package: Package,
  file: File,
  folder: Folder,
  'file-text': FileText,
  archive: Archive,
  files: Files,
  'folder-open': FolderOpen,
  settings: Settings,
  wrench: Wrench,
  hammer: Hammer,
  'sliders-horizontal': SlidersHorizontal,
  gauge: Gauge,
  'message-circle': MessageCircle,
  mail: Mail,
  users: Users,
  phone: Phone,
  'messages-square': MessagesSquare,
  lock: Lock,
  key: Key,
  shield: Shield,
  eye: Eye,
  'scan-face': ScanFace,
  house: House,
  calendar: Calendar,
  'map-pin': MapPin,
  'shopping-bag': ShoppingBag,
  wallet: Wallet,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  tag: Tag,
  flag: Flag,
  bell: Bell,
  palette: Palette,
  layers: Layers,
};

/** 图标分组列表（去重） */
export const CATEGORY_ICON_GROUPS: string[] = Array.from(
  new Set(CATEGORY_ICONS.map((i) => i.group)),
);
