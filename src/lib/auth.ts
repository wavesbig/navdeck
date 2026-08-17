import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';

/**
 * NextAuth v5 配置
 * - Credentials Provider + bcrypt 校验
 * - JWT 策略，30 天固定有效期
 * - 登录页 /login
 * - 简单内存限流：同用户名连续失败 5 次锁定 5 分钟
 */

// 模块级失败计数（单进程内存，自托管单实例场景够用）
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export const { handlers, auth } = NextAuth({
  // 信任当前主机，避免 NextAuth 在开发环境错误推断 AUTH_URL
  // 导致 /api/auth/session 返回重定向或错误页面
  trustHost: true,
  session: {
    strategy: 'jwt',
    // 30 天有效期（秒）
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;

        // 限流检查：同用户名连续失败 5 次锁定 5 分钟
        const attempts = loginAttempts.get(username);
        const now = Date.now();
        if (
          attempts &&
          attempts.count >= MAX_ATTEMPTS &&
          now - attempts.lastAttempt < LOCKOUT_MS
        ) {
          return null; // 锁定中，直接拒绝
        }

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
          loginAttempts.set(username, {
            count: (attempts?.count ?? 0) + 1,
            lastAttempt: now,
          });
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          loginAttempts.set(username, {
            count: (attempts?.count ?? 0) + 1,
            lastAttempt: now,
          });
          return null;
        }

        // 登录成功，清除失败计数
        loginAttempts.delete(username);
        return { id: user.id, name: user.username };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
