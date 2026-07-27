import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth（必须在 import route 之前）
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock prisma 单例
vi.mock('@/lib/db', () => ({
  prisma: {
    card: {
      updateMany: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DELETE, PATCH } from './[id]/route';
import { GET, POST } from './route';

const mockSession = { user: { id: 'user-1' } };
const mockAuth = vi.mocked(auth);
const mockCategoryFindMany = vi.mocked(prisma.category.findMany);
const mockCategoryCreate = vi.mocked(prisma.category.create);
const mockCategoryUpdate = vi.mocked(prisma.category.update);
const mockCategoryDelete = vi.mocked(prisma.category.delete);
const mockCategoryAggregate = vi.mocked(prisma.category.aggregate);
const mockCardUpdateMany = vi.mocked(prisma.card.updateMany);

function makeJsonRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost/api/categories', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('Categories API - Session 校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
  });

  it('GET /api/categories 未登录返回 401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('未登录');
  });

  it('POST /api/categories 未登录返回 401', async () => {
    const res = await POST(makeJsonRequest('POST', {}));
    expect(res.status).toBe(401);
  });

  it('PATCH /api/categories/:id 未登录返回 401', async () => {
    const res = await PATCH(makeJsonRequest('PATCH', {}), {
      params: Promise.resolve({ id: 'cat-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/categories/:id 未登录返回 401', async () => {
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'cat-1' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('Categories API - POST 字段校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
  });

  it('缺名称返回 400', async () => {
    const res = await POST(makeJsonRequest('POST', { icon: 'i' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/名称必填/);
  });

  it('空字符串名称返回 400', async () => {
    const res = await POST(makeJsonRequest('POST', { name: '   ' }));
    expect(res.status).toBe(400);
  });
});

describe('Categories API - CRUD 流程', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
  });

  it('GET /api/categories 返回含卡片的列表', async () => {
    const categories = [{ id: 'cat-1', name: 'NAS', cards: [] }];
    mockCategoryFindMany.mockResolvedValue(categories as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(categories);
    expect(mockCategoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { order: 'asc' },
        include: expect.objectContaining({ cards: expect.any(Object) }),
      }),
    );
  });

  it('POST 创建成功返回 201 + 自增 order', async () => {
    mockCategoryAggregate.mockResolvedValue({ _max: { order: 2 } } as never);
    const created = { id: 'new-cat', name: 'Tools', order: 3 };
    mockCategoryCreate.mockResolvedValue(created as never);

    const res = await POST(makeJsonRequest('POST', { name: 'Tools' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    expect(mockCategoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Tools',
          order: 3,
        }),
      }),
    );
  });

  it('PATCH 更新名称/图标/颜色', async () => {
    const updated = {
      id: 'cat-1',
      name: 'Renamed',
      icon: 'icon',
      color: '#fff',
    };
    mockCategoryUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(
      makeJsonRequest('PATCH', {
        name: 'Renamed',
        icon: 'icon',
        color: '#fff',
      }),
      { params: Promise.resolve({ id: 'cat-1' }) },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
    expect(mockCategoryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat-1' },
        data: expect.objectContaining({
          name: 'Renamed',
          icon: 'icon',
          color: '#fff',
        }),
      }),
    );
  });

  it('DELETE 删除时把卡片 categoryId 置空', async () => {
    mockCardUpdateMany.mockResolvedValue({ count: 3 } as never);
    mockCategoryDelete.mockResolvedValue({ id: 'cat-1' } as never);

    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'cat-1' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    // 先置空卡片 categoryId，再删除分类
    expect(mockCardUpdateMany).toHaveBeenCalledWith({
      where: { categoryId: 'cat-1' },
      data: { categoryId: null },
    });
    expect(mockCategoryDelete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
  });
});
