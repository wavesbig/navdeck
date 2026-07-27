import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';

/**
 * NextAuth v5 配置
 * - Credentials Provider + bcrypt 校验
 * - JWT 策略，30 天固定有效期
 * - 登录页 /login
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
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

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

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
