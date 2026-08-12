import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth（必须在 import route 之前）
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock prisma 单例
vi.mock('@/lib/db', () => ({
  prisma: {
    card: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DELETE, GET as GET_ONE, PATCH } from './[id]/route';
import { GET, POST } from './route';

// 构造带登录态的 session mock
const mockSession = { user: { id: 'user-1' } };
const mockAuth = vi.mocked(auth);
const mockCardFindMany = vi.mocked(prisma.card.findMany);
const mockCardFindUnique = vi.mocked(prisma.card.findUnique);
const mockCardCreate = vi.mocked(prisma.card.create);
const mockCardUpdate = vi.mocked(prisma.card.update);
const mockCardDelete = vi.mocked(prisma.card.delete);
const mockCardAggregate = vi.mocked(prisma.card.aggregate);

function makeJsonRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost/api/cards', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('Cards API - Session 校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
  });

  it('GET /api/cards 未登录返回 401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('未登录');
  });

  it('POST /api/cards 未登录返回 401', async () => {
    const res = await POST(makeJsonRequest('POST', {}));
    expect(res.status).toBe(401);
  });

  it('GET /api/cards/:id 未登录返回 401', async () => {
    const res = await GET_ONE(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/cards/:id 未登录返回 401', async () => {
    const res = await PATCH(makeJsonRequest('PATCH', {}), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/cards/:id 未登录返回 401', async () => {
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('Cards API - POST 字段校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
  });

  it('缺名称返回 400 + fieldErrors.name', async () => {
    const res = await POST(
      makeJsonRequest('POST', {
        internalUrl: 'http://a.com',
        externalUrl: 'http://b.com',
        icon: 'icon.png',
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fieldErrors.name).toBeDefined();
  });

  it('缺 internalUrl 返回 400 + fieldErrors.internalUrl', async () => {
    const res = await POST(
      makeJsonRequest('POST', {
        name: 'x',
        externalUrl: 'http://b.com',
        icon: 'icon.png',
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fieldErrors.internalUrl).toBeDefined();
  });

  it('internalUrl 非 http/https 返回 400', async () => {
    const res = await POST(
      makeJsonRequest('POST', {
        name: 'x',
        internalUrl: 'ftp://a.com',
        externalUrl: 'http://b.com',
        icon: 'icon.png',
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fieldErrors.internalUrl[0]).toMatch(/合法/);
  });

  it('缺 icon 正常创建，落库为空字符串（首字母色块回退）', async () => {
    mockCardAggregate.mockResolvedValue({ _max: { order: 0 } } as never);
    mockCardCreate.mockResolvedValue({ id: 'new-1' } as never);

    const res = await POST(
      makeJsonRequest('POST', {
        name: 'x',
        internalUrl: 'http://a.com',
        externalUrl: 'http://b.com',
      }),
    );
    expect(res.status).toBe(201);
    expect(mockCardCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ icon: '' }),
      }),
    );
  });

  it('缺 externalUrl 回退为内网地址', async () => {
    mockCardAggregate.mockResolvedValue({ _max: { order: 0 } } as never);
    mockCardCreate.mockResolvedValue({ id: 'new-1' } as never);

    const res = await POST(
      makeJsonRequest('POST', {
        name: 'x',
        internalUrl: 'http://a.com',
        icon: 'i',
      }),
    );
    expect(res.status).toBe(201);
    expect(mockCardCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ externalUrl: 'http://a.com' }),
      }),
    );
  });
});

describe('Cards API - CRUD 流程', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
  });

  it('GET /api/cards 返回卡片列表', async () => {
    const cards = [
      { id: 'card-1', name: 'NAS', categoryId: 'cat-1', order: 0 },
    ];
    mockCardFindMany.mockResolvedValue(cards as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(cards);
    expect(mockCardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.arrayContaining([
          expect.objectContaining({ order: 'asc' }),
        ]),
      }),
    );
  });

  it('POST /api/cards 创建成功返回 201', async () => {
    mockCardAggregate.mockResolvedValue({ _max: { order: 3 } } as never);
    const created = { id: 'new-1', name: 'NewCard', category: null };
    mockCardCreate.mockResolvedValue(created as never);

    const res = await POST(
      makeJsonRequest('POST', {
        name: 'NewCard',
        internalUrl: 'http://internal.com',
        externalUrl: 'http://external.com',
        icon: 'icon.png',
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    expect(mockCardCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'NewCard',
          order: 4,
        }),
      }),
    );
  });

  it('POST 带 categoryId 时校验分类存在', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    const res = await POST(
      makeJsonRequest('POST', {
        name: 'x',
        internalUrl: 'http://a.com',
        externalUrl: 'http://b.com',
        icon: 'i',
        categoryId: 'nonexistent',
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fieldErrors.categoryId).toBeDefined();
  });

  it('GET /api/cards/:id 不存在返回 404', async () => {
    mockCardFindUnique.mockResolvedValue(null);

    const res = await GET_ONE(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'ghost' }),
    });
    expect(res.status).toBe(404);
  });

  it('PATCH /api/cards/:id 更新成功', async () => {
    const updated = { id: 'card-1', name: 'Renamed' };
    mockCardUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makeJsonRequest('PATCH', { name: 'Renamed' }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
    expect(mockCardUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'card-1' },
        data: expect.objectContaining({ name: 'Renamed' }),
      }),
    );
  });

  it('PATCH 带 categoryId 时校验分类存在', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    const res = await PATCH(makeJsonRequest('PATCH', { categoryId: 'nope' }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/cards/:id 删除成功', async () => {
    mockCardFindUnique.mockResolvedValue({ id: 'card-1' } as never);
    mockCardDelete.mockResolvedValue({ id: 'card-1' } as never);

    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockCardDelete).toHaveBeenCalledWith({ where: { id: 'card-1' } });
  });
});
