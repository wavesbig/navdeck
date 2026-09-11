import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

/**
 * 默认密码检测
 *
 * 判断当前用户密码是否仍等于出厂默认密码。注意基准不能拿
 * AUTH_PASSWORD——部署者自定义密码时 seed 用它建号，库里哈希
 * 本来就等于它，会把正常部署误判为默认密码。
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
  const user = await prisma.user.findFirst();
  if (!user) return false;

  if (cache?.hash === user.passwordHash) return cache.result;

  // 出厂默认密码，与 seed 脚本 fallback 保持一致
  const result = await bcrypt.compare('changeme', user.passwordHash);
  cache = { hash: user.passwordHash, result };
  return result;
}
