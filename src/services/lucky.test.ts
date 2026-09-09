import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    card: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/preferences', () => ({
  getUserPreference: vi.fn(),
  setUserPreference: vi.fn(),
}));

vi.mock('@/lib/favicon', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/favicon')>();
  return { ...actual, fetchFavicon: vi.fn() };
});

vi.mock('@/lib/favicon-cache', () => ({
  fetchCachedFavicon: vi.fn(),
}));

vi.mock('@/lib/lucky', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/lucky')>();
  return { ...actual, fetchLuckyRules: vi.fn() };
});

import { prisma } from '@/lib/db';
import { fetchCachedFavicon } from '@/lib/favicon-cache';
import { fetchLuckyRules, type LuckyReverseProxyRule } from '@/lib/lucky';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import type { LuckyConfig } from '@/types';
import {
  clearLuckyDefaultCategory,
  deleteMissingLuckyCards,
  syncLuckyCards,
} from './lucky';

const mockFindMany = vi.mocked(prisma.card.findMany);
const mockAggregate = vi.mocked(prisma.card.aggregate);
const mockCreate = vi.mocked(prisma.card.create);
const mockUpdate = vi.mocked(prisma.card.update);
const mockDelete = vi.mocked(prisma.card.delete);
const mockDeleteMany = vi.mocked(prisma.card.deleteMany);
const mockFetchRules = vi.mocked(fetchLuckyRules);
const mockFetchCachedFavicon = vi.mocked(fetchCachedFavicon);
const mockGetUserPreference = vi.mocked(getUserPreference);
const mockSetUserPreference = vi.mocked(setUserPreference);

const config: LuckyConfig = {
  enabled: true,
  baseUrl: 'https://lucky.example.com:9527',
  openToken: 'test-token',
  defaultCategoryId: null,
  deletedRuleIds: ['rule:user-deleted'],
  lastSyncAt: null,
};

const activeRule: LuckyReverseProxyRule = {
  ruleId: 'rule:active',
  frontendDomain: 'active.example.com',
  backendLocation: 'http://192.168.1.10:5244',
  serviceType: 'reverseproxy',
};

function luckyCard(id: string, name: string, ruleId: string, missing: boolean) {
  return {
    id,
    name,
    internalUrl: 'http://192.168.1.10:5244',
    externalUrl: 'https://active.example.com:9527',
    lucky: {
      ruleId,
      missing,
      syncedAt: '2026-08-22T00:00:00.000Z',
    },
  };
}

describe('syncLuckyCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserPreference.mockResolvedValue(config);
    mockFetchCachedFavicon.mockRejectedValue(new Error('favicon unavailable'));
  });

  it('同步只标记失效卡片，不自动删除', async () => {
    mockFindMany.mockResolvedValue([
      luckyCard('card-active', 'active', 'rule:active', false),
    ] as never);
    mockFetchRules.mockResolvedValue([]);

    const result = await syncLuckyCards();

    expect(result.markedMissing).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'card-active' },
      data: {
        lucky: {
          ruleId: 'rule:active',
          missing: true,
          syncedAt: expect.any(String),
        },
      },
    });
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockSetUserPreference).toHaveBeenLastCalledWith(
      'lucky',
      expect.objectContaining({ deletedRuleIds: ['rule:user-deleted'] }),
    );
  });

  it('Lucky 规则恢复后把失效卡片标记为可用', async () => {
    mockFindMany.mockResolvedValue([
      luckyCard('card-active', 'active', 'rule:active', true),
    ] as never);
    mockFetchRules.mockResolvedValue([activeRule]);

    const result = await syncLuckyCards();

    expect(result.updated).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'card-active' },
        data: expect.objectContaining({
          lucky: expect.objectContaining({ missing: false }),
        }),
      }),
    );
  });

  it('用户手动删除过的 Lucky 规则仍然永久跳过', async () => {
    mockFindMany.mockResolvedValue([]);
    mockFetchRules.mockResolvedValue([
      { ...activeRule, ruleId: 'rule:user-deleted' },
    ]);

    const result = await syncLuckyCards();

    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('创建 Lucky 卡片后抓取并缓存默认 favicon', async () => {
    mockFindMany.mockResolvedValue([]);
    mockFetchRules.mockResolvedValue([{ ...activeRule, name: 'Alist 备注名' }]);
    mockAggregate.mockResolvedValue({ _max: { order: -1 } } as never);
    mockCreate.mockResolvedValue({ id: 'card-new' } as never);
    mockFetchCachedFavicon.mockResolvedValue({
      url: '/api/icons/file?path=cards/fallback.ico',
      source: 'direct',
    });

    const result = await syncLuckyCards();

    expect(result.created).toBe(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Alist 备注名' }),
      }),
    );
    expect(mockFetchCachedFavicon).toHaveBeenCalledTimes(1);
    expect(mockFetchCachedFavicon).toHaveBeenCalledWith(
      'http://192.168.1.10:5244',
      'https://active.example.com:9527',
    );
    await vi.waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'card-new' },
        data: {
          icon: '/api/icons/file?path=cards/fallback.ico',
        },
      }),
    );
  });

  it('子规则名称为空时用子域名前缀命名卡片', async () => {
    mockFindMany.mockResolvedValue([]);
    mockFetchRules.mockResolvedValue([activeRule]);
    mockAggregate.mockResolvedValue({ _max: { order: -1 } } as never);
    mockCreate.mockResolvedValue({ id: 'card-new' } as never);

    await syncLuckyCards();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'active' }),
      }),
    );
  });

  it('同步时把旧域名自动命名的卡片改为子规则名称', async () => {
    mockFindMany.mockResolvedValue([
      luckyCard('card-active', 'active', 'rule:active', false),
    ] as never);
    mockFetchRules.mockResolvedValue([{ ...activeRule, name: 'Alist 备注名' }]);

    const result = await syncLuckyCards();

    expect(result.updated).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Alist 备注名' }),
      }),
    );
  });

  it('同步时不覆盖用户手动修改的卡片名', async () => {
    const card = {
      ...luckyCard('card-active', '手动名称', 'rule:active', false),
      icon: '/icons/library/custom.svg',
    };
    mockFindMany.mockResolvedValue([card] as never);
    mockFetchRules.mockResolvedValue([{ ...activeRule, name: 'Alist 备注名' }]);

    const result = await syncLuckyCards();

    expect(result.updated).toBe(0);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('同步时清理并重抓 Google S2 存量图标', async () => {
    const card = {
      ...luckyCard('card-active', 'active', 'rule:active', false),
      icon: 'https://www.google.com/s2/favicons?domain=192.168.1.10&sz=64',
    };
    mockFindMany.mockResolvedValue([card] as never);
    mockFetchRules.mockResolvedValue([activeRule]);
    mockFetchCachedFavicon.mockResolvedValueOnce({
      url: '/api/icons/file?path=cards/google-refreshed.ico',
      source: 'direct',
    });

    const result = await syncLuckyCards();

    expect(result.updated).toBe(1);
    await vi.waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'card-active' },
        data: {
          icon: '/api/icons/file?path=cards/google-refreshed.ico',
        },
      }),
    );
  });

  it('同步时把旧内网绝对 icon 换成站内缓存', async () => {
    const card = {
      ...luckyCard('card-active', 'active', 'rule:active', false),
      icon: 'http://192.168.1.10:5244/images/icon-192x192.png',
    };
    mockFindMany.mockResolvedValue([card] as never);
    mockFetchRules.mockResolvedValue([activeRule]);
    mockFetchCachedFavicon.mockResolvedValue({
      url: '/api/icons/file?path=cards/internal-refreshed.png',
      source: 'html',
    });

    const result = await syncLuckyCards();

    expect(result.updated).toBe(1);
    expect(mockFetchCachedFavicon).toHaveBeenCalledWith(
      'http://192.168.1.10:5244',
      'https://active.example.com:9527',
    );
    await vi.waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'card-active' },
        data: {
          icon: '/api/icons/file?path=cards/internal-refreshed.png',
        },
      }),
    );
  });
});

describe('deleteMissingLuckyCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserPreference.mockResolvedValue(config);
  });

  it('一键删除失效卡片，但不写入永久跳过列表', async () => {
    mockFindMany.mockResolvedValue([
      luckyCard('card-1', 'qb', 'rule:qb', true),
      luckyCard('card-2', 'alist', 'rule:alist', true),
      luckyCard('card-3', 'active', 'rule:active', false),
      { id: 'card-4', name: 'manual', lucky: null },
    ] as never);

    await expect(deleteMissingLuckyCards()).resolves.toBe(2);

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['card-1', 'card-2'] } },
    });
    expect(mockSetUserPreference).not.toHaveBeenCalled();
  });

  it('没有失效卡片时不触发删除', async () => {
    mockFindMany.mockResolvedValue([
      luckyCard('card-active', 'active', 'rule:active', false),
    ] as never);

    await expect(deleteMissingLuckyCards()).resolves.toBe(0);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });
});

describe('clearLuckyDefaultCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('匹配时把 defaultCategoryId 置 null 并写入', async () => {
    mockGetUserPreference.mockResolvedValue({
      ...config,
      defaultCategoryId: 'cat-1',
    });

    await clearLuckyDefaultCategory('cat-1');

    expect(mockSetUserPreference).toHaveBeenCalledWith(
      'lucky',
      expect.objectContaining({ defaultCategoryId: null }),
    );
  });

  it('不匹配时不写入', async () => {
    mockGetUserPreference.mockResolvedValue({
      ...config,
      defaultCategoryId: 'cat-1',
    });

    await clearLuckyDefaultCategory('cat-other');

    expect(mockSetUserPreference).not.toHaveBeenCalled();
  });
});
