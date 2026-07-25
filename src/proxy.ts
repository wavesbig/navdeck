import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Next.js 16 Proxy（原 middleware）
 * 保护所有路由，未登录用户重定向到 /login
 * 排除：API、静态资源、登录页
 */
export const config = {
  matcher: [
    // 排除 api、_next 静态资源、favicon、login 页本身
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};

export default auth((req) => {
  const isAuthed = !!req.auth;
  if (!isAuthed) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
});
