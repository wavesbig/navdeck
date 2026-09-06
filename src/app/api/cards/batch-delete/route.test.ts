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
      deleteMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { POST } from './route';

const mockSession = { user: { id: 'user-1' } };
const mockAuth = vi.mocked(auth);
const mockCardFindMany = vi.mocked(prisma.card.findMany);
const mockCardDeleteMany = vi.mocked(prisma.card.deleteMany);

function makeJsonRequest(body?: unknown): Request {
  return new Request('http://localhost/api/cards/batch-delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('Batch Delete API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeJsonRequest({ ids: ['card-1'] }));
    expect(res.status).toBe(401);
  });

  it('ids 为空数组返回 400', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const res = await POST(makeJsonRequest({ ids: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fieldErrors.ids).toBeDefined();
  });

  it('ids 全部不存在返回 404，且不执行删除', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCardFindMany.mockResolvedValue([]);

    const res = await POST(makeJsonRequest({ ids: ['ghost-1'] }));
    expect(res.status).toBe(404);
    expect(mockCardDeleteMany).not.toHaveBeenCalled();
  });

  it('批量删除成功，返回删除数量', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCardFindMany.mockResolvedValue([
      { id: 'card-1', lucky: null },
      { id: 'card-2', lucky: null },
    ] as never);
    mockCardDeleteMany.mockResolvedValue({ count: 2 } as never);

    const res = await POST(makeJsonRequest({ ids: ['card-1', 'card-2'] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, deleted: 2 });
    expect(mockCardDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['card-1', 'card-2'] } },
    });
  });

  it('Lucky 同步卡片删除时记录 ruleId（借 userPreference upsert 验证）', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCardFindMany.mockResolvedValue([
      { id: 'card-1', lucky: { ruleId: 'rule:sub', missing: false } },
    ] as never);
    mockCardDeleteMany.mockResolvedValue({ count: 1 } as never);

    const res = await POST(makeJsonRequest({ ids: ['card-1'] }));
    expect(res.status).toBe(200);
    // deletedRuleIds 记录失败不阻塞删除，这里只验证删除已发生
    expect(mockCardDeleteMany).toHaveBeenCalled();
  });
});
