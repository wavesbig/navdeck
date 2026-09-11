import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bcryptjs')>();
  return {
    default: { ...actual, compare: vi.fn(actual.compare) },
  };
});

vi.mock('@/lib/db', () => ({
  prisma: { user: { findFirst: vi.fn() } },
}));

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { isUsingDefaultPassword } from './security';

const findFirst = vi.mocked(prisma.user.findFirst);
const compare = vi.mocked(bcrypt.compare);

function mockUser(password: string) {
  return {
    id: 'u1',
    username: 'admin',
    passwordHash: bcrypt.hashSync(password, 4),
  } as never;
}

describe('isUsingDefaultPassword', () => {
  beforeEach(() => {
    findFirst.mockReset();
    compare.mockClear();
  });

  it('默认密码 changeme 时提示', async () => {
    findFirst.mockResolvedValue(mockUser('changeme'));
    await expect(isUsingDefaultPassword()).resolves.toBe(true);
  });

  it('compose 自定义密码不误报', async () => {
    findFirst.mockResolvedValue(mockUser('my-secret'));
    await expect(isUsingDefaultPassword()).resolves.toBe(false);
  });

  it('UI 修改密码后不再提示', async () => {
    findFirst.mockResolvedValue(mockUser('new-pass'));
    await expect(isUsingDefaultPassword()).resolves.toBe(false);
  });

  it('同一哈希命中记忆化，不重复比对', async () => {
    findFirst.mockResolvedValue(mockUser('changeme'));
    await isUsingDefaultPassword();
    await isUsingDefaultPassword();
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it('无用户时不提示', async () => {
    findFirst.mockResolvedValue(null);
    await expect(isUsingDefaultPassword()).resolves.toBe(false);
  });
});
