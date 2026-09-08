import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

/**
 * 默认密码检测
 *
 * 判断当前用户密码是否仍等于初始部署密码（AUTH_PASSWORD 环境变量，
 * seed 用它创建账号）。用于首页安全提示横幅引导修改密码。
 *
 * bcrypt.compare 每次约 60-100ms，按 passwordHash 记忆化：
 * 同一哈希（密码未变）只比对一次，改密后哈希变化自动失效。
 */
interface DefaultPasswordCache {
  hash: string;
  result: boolean;
}

let cache: DefaultPasswordCache | null = null;

export async function isUsingDefaultPassword(): Promise<boolean> {
  const envPassword = process.env.AUTH_PASSWORD;
  if (!envPassword) return false;

  const user = await prisma.user.findFirst();
  if (!user) return false;

  if (cache?.hash === user.passwordHash) return cache.result;

  const result = await bcrypt.compare(envPassword, user.passwordHash);
  cache = { hash: user.passwordHash, result };
  return result;
}
