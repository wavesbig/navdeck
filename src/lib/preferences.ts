import { prisma } from '@/lib/db';

/**
 * UserPreference 读写工具
 *
 * 简单键值对存储（networkMode / theme / searchEngine / widgetBarWidth），
 * 通过 upsert 保证读取时能创建默认值。
 */

/** 读取首选项，不存在则返回 fallback */
export async function getUserPreference<T>(
  key: string,
  fallback: T,
): Promise<T> {
  const row = await prisma.userPreference.findUnique({ where: { key } });
  if (!row) return fallback;
  // 尝试解析 JSON，失败则直接返回字符串
  try {
    return JSON.parse(row.value) as T;
  } catch {
    // 字符串直接返回（兼容 NetworkMode / ThemeMode 等字符串字面量）
    return row.value as unknown as T;
  }
}

/** 写入首选项（upsert） */
export async function setUserPreference<T>(
  key: string,
  value: T,
): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await prisma.userPreference.upsert({
    where: { key },
    create: { key, value: serialized },
    update: { value: serialized },
  });
}
