import 'dotenv/config';
import { prisma } from '../src/lib/db';

/**
 * 演示数据种子脚本
 *
 * 用于测试布局：填充几个分类 + 每个分类下若干卡片 + 一些未分类卡片
 * 仅在 DB 为空时执行（避免重复）
 */
const CATEGORIES = [
  { name: '媒体', icon: 'film', color: '#e74c3c' },
  { name: '下载', icon: 'download', color: '#3498db' },
  { name: '网盘', icon: 'cloud', color: '#2ecc71' },
  { name: '工具', icon: 'wrench', color: '#9b59b6' },
];

const CARDS = [
  // 媒体
  {
    name: 'Jellyfin',
    category: '媒体',
    internalUrl: 'http://192.168.1.10:8096',
    externalUrl: 'https://jellyfin.example.com',
    description: '开源媒体服务器',
  },
  {
    name: 'Emby',
    category: '媒体',
    internalUrl: 'http://192.168.1.10:8095',
    externalUrl: 'https://emby.example.com',
    description: '私人媒体库',
  },
  {
    name: 'Plex',
    category: '媒体',
    internalUrl: 'http://192.168.1.10:32400',
    externalUrl: 'https://plex.example.com',
    description: '流媒体平台',
  },
  {
    name: 'Navidrome',
    category: '媒体',
    internalUrl: 'http://192.168.1.10:4533',
    externalUrl: 'https://navidrome.example.com',
    description: '音乐流媒体',
  },
  {
    name: 'Audiobookshelf',
    category: '媒体',
    internalUrl: 'http://192.168.1.10:13378',
    externalUrl: 'https://abs.example.com',
    description: '有声书库',
  },

  // 下载
  {
    name: 'qBittorrent',
    category: '下载',
    internalUrl: 'http://192.168.1.10:8080',
    externalUrl: 'https://qb.example.com',
    description: 'BT 下载客户端',
  },
  {
    name: 'Transmission',
    category: '下载',
    internalUrl: 'http://192.168.1.10:9091',
    externalUrl: 'https://tr.example.com',
    description: '轻量 BT 客户端',
  },
  {
    name: 'Aria2',
    category: '下载',
    internalUrl: 'http://192.168.1.10:6800',
    externalUrl: 'https://aria2.example.com',
    description: '多协议下载器',
  },
  {
    name: 'Prowlarr',
    category: '下载',
    internalUrl: 'http://192.168.1.10:9696',
    externalUrl: 'https://prowlarr.example.com',
    description: '索引器聚合',
  },

  // 网盘
  {
    name: 'Alist',
    category: '网盘',
    internalUrl: 'http://192.168.1.10:5244',
    externalUrl: 'https://alist.example.com',
    description: '网盘聚合管理',
  },
  {
    name: 'Nextcloud',
    category: '网盘',
    internalUrl: 'http://192.168.1.10:8081',
    externalUrl: 'https://nextcloud.example.com',
    description: '私有云盘',
  },
  {
    name: 'Cloudreve',
    category: '网盘',
    internalUrl: 'http://192.168.1.10:5212',
    externalUrl: 'https://cloudreve.example.com',
    description: '公有云网盘',
  },

  // 工具
  {
    name: 'Portainer',
    category: '工具',
    internalUrl: 'http://192.168.1.10:9000',
    externalUrl: 'https://portainer.example.com',
    description: '容器管理面板',
  },
  {
    name: 'AdGuard Home',
    category: '工具',
    internalUrl: 'http://192.168.1.10:3000',
    externalUrl: 'https://adguard.example.com',
    description: 'DNS 广告过滤',
  },
  {
    name: 'Vaultwarden',
    category: '工具',
    internalUrl: 'http://192.168.1.10:8222',
    externalUrl: 'https://vw.example.com',
    description: 'Bitwarden 服务端',
  },
  {
    name: 'Gitea',
    category: '工具',
    internalUrl: 'http://192.168.1.10:3001',
    externalUrl: 'https://gitea.example.com',
    description: '轻量 Git 服务',
  },
  {
    name: 'Home Assistant',
    category: '工具',
    internalUrl: 'http://192.168.1.10:8123',
    externalUrl: 'https://ha.example.com',
    description: '智能家居中枢',
  },

  // 未分类
  {
    name: 'Immich',
    category: null,
    internalUrl: 'http://192.168.1.10:2283',
    externalUrl: 'https://immich.example.com',
    description: '自托管照片库',
  },
  {
    name: 'Memos',
    category: null,
    internalUrl: 'http://192.168.1.10:5230',
    externalUrl: 'https://memos.example.com',
    description: '轻量笔记',
  },
];

async function main() {
  const existingCards = await prisma.card.count();
  if (existingCards > 0) {
    console.log(`已存在 ${existingCards} 张卡片，跳过演示数据初始化`);
    await prisma.$disconnect();
    return;
  }

  console.log('开始填充演示数据...');

  // 创建分类
  const catMap = new Map<string, string>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const created = await prisma.category.create({
      data: { name: c.name, icon: c.icon, color: c.color, order: i },
    });
    catMap.set(c.name, created.id);
    console.log(`  分类创建：${c.name} (${created.id})`);
  }

  // 创建卡片
  let order = 0;
  let lastCat: string | null = null;
  for (const card of CARDS) {
    // 每个分类内 order 从 0 开始
    if (card.category !== lastCat) {
      order = 0;
      lastCat = card.category;
    }
    const categoryId = card.category
      ? (catMap.get(card.category) ?? null)
      : null;
    await prisma.card.create({
      data: {
        name: card.name,
        internalUrl: card.internalUrl,
        externalUrl: card.externalUrl,
        icon: '', // 留空，测试空图标占位
        description: card.description,
        categoryId,
        order,
      },
    });
    order++;
  }
  console.log(`已创建 ${CARDS.length} 张演示卡片`);

  console.log('演示数据填充完成');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
