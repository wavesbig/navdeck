import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';

// 默认 widget 实例（多实例模型，按 NasStatus → ResourceGauge 顺序）
// size 默认 'M'（标准），可选 'S'（紧凑）/ 'L'（详细，横条中占 2 列）
// 不含倒数日/正数日：日期类实例必须携带日期项（先填日期再出卡片），无默认空卡片
const DEFAULT_WIDGET_INSTANCES = [
  { widgetKey: 'nas-status', order: 0, size: 'M' },
  { widgetKey: 'resource-gauge', order: 1, size: 'M' },
];

// 默认全局配置
const DEFAULT_PREFERENCES = [
  { key: 'networkMode', value: 'auto' }, // auto | internal | external
  { key: 'theme', value: 'system' }, // light | dark | system
  { key: 'fontSize', value: '100' }, // 90-150（%），步进 5
  { key: 'searchEngine', value: 'google' }, // google | bing | baidu | github | stackoverflow
  // 壁纸偏好：wallpaper 默认指向第一张预设
  // 由 seedWallpapers 函数动态注入（避免硬编码 id）
];

// 默认预设壁纸（已下载到 public/wallpapers/，从自己服务器加载避免外部 CDN 慢）
// 一张图适配两种主题（light/dark 共用，靠遮罩调整可读性），不区分 theme
const DEFAULT_WALLPAPERS = [
  {
    name: '晨雾山脉',
    source: 'preset',
    path: '/wallpapers/mountain-mist.jpg',
  },
  {
    name: '海面晨光',
    source: 'preset',
    path: '/wallpapers/sea-dawn.jpg',
  },
  {
    name: '极简白',
    source: 'preset',
    path: '/wallpapers/minimal-light.jpg',
  },
  {
    name: '城市夜景',
    source: 'preset',
    path: '/wallpapers/city-night.jpg',
  },
  {
    name: '深空星云',
    source: 'preset',
    path: '/wallpapers/deep-space.jpg',
  },
  {
    name: '黑岩熔流',
    source: 'preset',
    path: '/wallpapers/dark-lava.jpg',
  },
];

async function main() {
  console.log('NavDeck seed: 开始初始化...');

  // 1. 初始化默认账号（仅 DB 为空时从环境变量读）
  const existingUser = await prisma.user.findFirst();
  if (existingUser) {
    console.log(`账号已存在（${existingUser.username}），跳过初始化`);
  } else {
    const username = process.env.AUTH_USERNAME ?? 'admin';
    const password = process.env.AUTH_PASSWORD ?? 'changeme';
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { username, passwordHash },
    });
    console.log(`默认账号已创建：${username}`);
    console.log('⚠️  请尽快在「设置 → 基础设置 → 账号管理」修改默认密码');
  }

  // 2. 初始化默认 widget 实例（仅 DB 为空时）
  const existingWidgets = await prisma.widgetInstance.findFirst();
  if (existingWidgets) {
    console.log('Widget 实例已存在，跳过初始化');
  } else {
    await prisma.widgetInstance.createMany({
      data: DEFAULT_WIDGET_INSTANCES,
    });
    console.log(
      `已初始化 ${DEFAULT_WIDGET_INSTANCES.length} 个默认 widget 实例`,
    );
  }

  // 3. 初始化默认全局配置（仅 DB 为空时）
  const existingPrefs = await prisma.userPreference.findFirst();
  if (existingPrefs) {
    console.log('全局配置已存在，跳过初始化');
  } else {
    await prisma.userPreference.createMany({ data: DEFAULT_PREFERENCES });
    console.log(`已初始化 ${DEFAULT_PREFERENCES.length} 项默认全局配置`);
  }

  // 4. 初始化预设壁纸（仅 DB 为空时，独立于 preferences 检查）
  const existingWallpaper = await prisma.wallpaper.findFirst();
  if (existingWallpaper) {
    console.log('壁纸预设已存在，跳过初始化');
  } else {
    await prisma.wallpaper.createMany({ data: DEFAULT_WALLPAPERS });
    console.log(`已初始化 ${DEFAULT_WALLPAPERS.length} 张预设壁纸`);

    // 如果壁纸偏好未设置，注入默认值（指向第一张预设）
    const first = await prisma.wallpaper.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (first) {
      await prisma.userPreference.upsert({
        where: { key: 'wallpaper' },
        update: {},
        create: { key: 'wallpaper', value: first.id },
      });
    }
    console.log('已注入默认壁纸偏好（wallpaper）');
  }

  console.log('NavDeck seed: 完成');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
