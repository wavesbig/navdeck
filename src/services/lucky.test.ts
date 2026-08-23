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

vi.mock('@/lib/lucky', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/lucky')>();
  return { ...actual, fetchLuckyRules: vi.fn() };
});

import { prisma } from '@/lib/db';
import { fetchFavicon } from '@/lib/favicon';
import { fetchLuckyRules, type LuckyReverseProxyRule } from '@/lib/lucky';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import type { LuckyConfig } from '@/types';
import { deleteMissingLuckyCards, syncLuckyCards } from './lucky';

const mockFindMany = vi.mocked(prisma.card.findMany);
const mockAggregate = vi.mocked(prisma.card.aggregate);
const mockCreate = vi.mocked(prisma.card.create);
const mockUpdate = vi.mocked(prisma.card.update);
const mockDelete = vi.mocked(prisma.card.delete);
const mockDeleteMany = vi.mocked(prisma.card.deleteMany);
const mockFetchRules = vi.mocked(fetchLuckyRules);
const mockFetchFavicon = vi.mocked(fetchFavicon);
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
    mockFetchFavicon.mockRejectedValue(new Error('favicon unavailable'));
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

  it('内网地址获取不到 favicon 时改用外网域名', async () => {
    mockFindMany.mockResolvedValue([]);
    mockFetchRules.mockResolvedValue([activeRule]);
    mockAggregate.mockResolvedValue({ _max: { order: -1 } } as never);
    mockCreate.mockResolvedValue({ id: 'card-new' } as never);
    mockFetchFavicon.mockResolvedValueOnce(null).mockResolvedValueOnce({
      url: 'https://active.example.com:9527/favicon.ico',
      source: 'direct',
    });

    const result = await syncLuckyCards();

    expect(result.created).toBe(1);
    expect(mockFetchFavicon).toHaveBeenNthCalledWith(
      1,
      'http://192.168.1.10:5244',
    );
    expect(mockFetchFavicon).toHaveBeenNthCalledWith(
      2,
      'https://active.example.com:9527',
    );
    await vi.waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'card-new' },
        data: {
          icon: 'https://active.example.com:9527/favicon.ico',
        },
      }),
    );
  });

  it('同步时清理并重抓 Google S2 存量图标', async () => {
    const card = {
      ...luckyCard('card-active', 'active', 'rule:active', false),
      icon: 'https://www.google.com/s2/favicons?domain=192.168.1.10&sz=64',
    };
    mockFindMany.mockResolvedValue([card] as never);
    mockFetchRules.mockResolvedValue([activeRule]);
    mockFetchFavicon.mockResolvedValueOnce(null).mockResolvedValueOnce({
      url: 'https://active.example.com:9527/favicon.ico',
      source: 'direct',
    });

    const result = await syncLuckyCards();

    expect(result.updated).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'card-active' },
        data: expect.objectContaining({ icon: '' }),
      }),
    );
    await vi.waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'card-active' },
        data: {
          icon: 'https://active.example.com:9527/favicon.ico',
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
