import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';

// 默认 widget 配置（4 个全部启用，按 NasStatus → ResourceGauge → 倒数日 → 正数日 顺序）
const DEFAULT_WIDGETS = [
  { widgetKey: 'nas-status', enabled: true, order: 0 },
  { widgetKey: 'resource-gauge', enabled: true, order: 1 },
  { widgetKey: 'countdown', enabled: true, order: 2 },
  { widgetKey: 'countup', enabled: true, order: 3 },
];

// 默认全局配置
const DEFAULT_PREFERENCES = [
  { key: 'networkMode', value: 'auto' }, // auto | internal | external
  { key: 'theme', value: 'system' }, // light | dark | system
  { key: 'searchEngine', value: 'google' }, // google | bing | baidu | github | stackoverflow
  { key: 'widgetLayout', value: '1' }, // 1 | 2（栏数）
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

  // 2. 初始化默认 widget 配置（仅 DB 为空时）
  const existingWidgets = await prisma.widgetConfig.findFirst();
  if (existingWidgets) {
    console.log('Widget 配置已存在，跳过初始化');
  } else {
    await prisma.widgetConfig.createMany({ data: DEFAULT_WIDGETS });
    console.log(`已初始化 ${DEFAULT_WIDGETS.length} 个默认 widget 配置`);
  }

  // 3. 初始化默认全局配置（仅 DB 为空时）
  const existingPrefs = await prisma.userPreference.findFirst();
  if (existingPrefs) {
    console.log('全局配置已存在，跳过初始化');
  } else {
    await prisma.userPreference.createMany({ data: DEFAULT_PREFERENCES });
    console.log(`已初始化 ${DEFAULT_PREFERENCES.length} 项默认全局配置`);
  }

  console.log('NavDeck seed: 完成');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
