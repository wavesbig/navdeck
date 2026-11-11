import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { applySunPanelImport, parseSunPanelData } from './sun-panel';

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

describe('Sun-Panel Data Parser', () => {
  it('应成功解析 Sun-Panel 官方标准导出格式', () => {
    const sunPanelJson = JSON.stringify({
      version: 1,
      appName: 'Sun-Panel-Config',
      exportTime: '2026-03-01 12:00:00',
      appVersion: '1.5.0',
      icons: [
        {
          title: '开发工具',
          sort: 1,
          children: [
            {
              title: 'GitHub',
              sort: 0,
              url: 'https://github.com',
              lanUrl: 'http://192.168.1.50:8080',
              description: '代码仓库托管服务',
              openMethod: 2,
              icon: {
                itemType: 2,
                src: 'https://github.com/favicon.ico',
              },
            },
            {
              title: '本地网关',
              sort: 1,
              lanUrl: 'http://192.168.1.1',
              description: '主路由器后台',
              openMethod: 3,
              icon: {
                itemType: 1,
                text: '网关',
              },
            },
          ],
        },
      ],
      md5: 'mock-md5-hash',
    });

    const result = parseSunPanelData(sunPanelJson);

    expect(result.totalCategories).toBe(1);
    expect(result.totalCards).toBe(2);
    expect(result.skippedCards).toBe(0);

    const devCategory = result.categories[0];
    expect(devCategory.name).toBe('开发工具');
    expect(devCategory.cards).toHaveLength(2);

    const githubCard = devCategory.cards[0];
    expect(githubCard.name).toBe('GitHub');
    expect(githubCard.internalUrl).toBe('http://192.168.1.50:8080');
    expect(githubCard.externalUrl).toBe('https://github.com');
    expect(githubCard.icon).toBe('https://github.com/favicon.ico');
    expect(githubCard.description).toBe('代码仓库托管服务');
    expect(githubCard.openInDialog).toBe(false);

    const gatewayCard = devCategory.cards[1];
    expect(gatewayCard.name).toBe('本地网关');
    expect(gatewayCard.internalUrl).toBe('http://192.168.1.1');
    expect(gatewayCard.externalUrl).toBe('http://192.168.1.1'); // 回退为 lanUrl
    expect(gatewayCard.icon).toBe('网关');
    expect(gatewayCard.openInDialog).toBe(true); // openMethod 3 -> true
  });

  it('应正确处理纯分组数组与卡片扁平数组', () => {
    // 纯分组数组
    const groupsData = [
      {
        title: '常用工具',
        children: [
          {
            title: 'Google',
            url: 'https://google.com',
          },
        ],
      },
    ];
    const groupResult = parseSunPanelData(groupsData);
    expect(groupResult.totalCategories).toBe(1);
    expect(groupResult.categories[0].name).toBe('常用工具');
    expect(groupResult.totalCards).toBe(1);

    // 扁平卡片数组
    const flatCards = [
      {
        title: 'Bing',
        url: 'https://bing.com',
      },
    ];
    const flatResult = parseSunPanelData(flatCards);
    expect(flatResult.totalCategories).toBe(1);
    expect(flatResult.categories[0].name).toBe('未分类');
    expect(flatResult.totalCards).toBe(1);
  });

  it('应跳过内外网 URL 均为空的卡片，并计入 skippedCards', () => {
    const rawData = {
      icons: [
        {
          title: '分组',
          children: [
            { title: '空卡片 1', url: '', lanUrl: '' },
            { title: '有效卡片', url: 'https://example.com' },
          ],
        },
      ],
    };

    const result = parseSunPanelData(rawData);
    expect(result.totalCards).toBe(1);
    expect(result.skippedCards).toBe(1);
    expect(result.categories[0].cards[0].name).toBe('有效卡片');
  });

  it('超长描述应自动截断至 200 字符', () => {
    const longDesc = 'A'.repeat(250);
    const rawData = {
      icons: [
        {
          title: '分组',
          children: [
            {
              title: '长描述项',
              url: 'https://example.com',
              description: longDesc,
            },
          ],
        },
      ],
    };

    const result = parseSunPanelData(rawData);
    expect(result.categories[0].cards[0].description).toHaveLength(200);
  });

  it('非合法 JSON 格式或空数据应抛出友好错误提示', () => {
    expect(() => parseSunPanelData('invalid json string')).toThrow(
      'JSON 解析失败',
    );
    expect(() => parseSunPanelData({})).toThrow('未在数据中找到');
  });

  it('应兼容下划线命名、字段别名、无协议 URL 自动补齐与 JSON 字符串图标', () => {
    const rawData = {
      groups: [
        {
          group_name: '媒体影音',
          items: [
            {
              name: 'Jellyfin',
              link: 'jellyfin.local:8096',
              lan_url: '192.168.1.120:8096',
              remark: '自建影视库',
              open_method: 3,
              icon: JSON.stringify({
                itemType: 2,
                src: 'https://jellyfin.org/favicon.ico',
              }),
            },
          ],
        },
      ],
    };

    const result = parseSunPanelData(rawData);
    expect(result.totalCategories).toBe(1);
    expect(result.categories[0].name).toBe('媒体影音');

    const card = result.categories[0].cards[0];
    expect(card.name).toBe('Jellyfin');
    expect(card.externalUrl).toBe('http://jellyfin.local:8096');
    expect(card.internalUrl).toBe('http://192.168.1.120:8096');
    expect(card.description).toBe('自建影视库');
    expect(card.openInDialog).toBe(true);
    expect(card.icon).toBe('https://jellyfin.org/favicon.ico');
  });
});

describe('Sun-Panel Data Import (Database)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('覆盖模式（overwrite）应先清空现有数据后重建', async () => {
    const mockTx = {
      card: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      category: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'cat-new-1', name: '新分组' }),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return await callback(mockTx as never);
    });

    const parsedData = {
      categories: [
        {
          name: '新分组',
          order: 0,
          cards: [
            {
              name: '测试',
              internalUrl: 'http://test',
              externalUrl: 'http://test',
              icon: '',
              description: null,
              openInDialog: false,
              order: 0,
            },
          ],
        },
      ],
      totalCategories: 1,
      totalCards: 1,
      skippedCards: 0,
    };

    const stats = await applySunPanelImport(parsedData, 'overwrite');

    expect(mockTx.card.deleteMany).toHaveBeenCalled();
    expect(mockTx.category.deleteMany).toHaveBeenCalled();
    expect(mockTx.category.create).toHaveBeenCalledWith({
      data: { name: '新分组', order: 0 },
    });
    expect(mockTx.card.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: '测试',
          categoryId: 'cat-new-1',
          order: 0,
        }),
      ],
    });
    expect(stats.categoriesCreated).toBe(1);
    expect(stats.cardsCreated).toBe(1);
  });

  it('追加模式（append）应复用同名分类并追加卡片', async () => {
    const existingCategory = { id: 'cat-exist-1', name: '常用', order: 0 };
    const mockTx = {
      category: {
        findMany: vi.fn().mockResolvedValue([existingCategory]),
        create: vi.fn(),
      },
      card: {
        aggregate: vi.fn().mockResolvedValue({ _max: { order: 2 } }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return await callback(mockTx as never);
    });

    const parsedData = {
      categories: [
        {
          name: '常用',
          order: 0,
          cards: [
            {
              name: '新卡片',
              internalUrl: 'http://new',
              externalUrl: 'http://new',
              icon: '',
              description: null,
              openInDialog: false,
              order: 0,
            },
          ],
        },
      ],
      totalCategories: 1,
      totalCards: 1,
      skippedCards: 0,
    };

    const stats = await applySunPanelImport(parsedData, 'append');

    expect(mockTx.category.create).not.toHaveBeenCalled();
    expect(mockTx.card.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: '新卡片',
          categoryId: 'cat-exist-1',
          order: 3, // 原最大 order 2 + 1
        }),
      ],
    });
    expect(stats.categoriesReused).toBe(1);
    expect(stats.cardsCreated).toBe(1);
  });
});
