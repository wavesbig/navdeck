import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Next.js 16 Proxy（原 middleware）
 * 保护所有路由，未登录用户重定向到 /login
 * 排除：API、静态资源、登录页
 */
export const config = {
  matcher: [
    // 排除 api、静态资源、品牌图标/manifest（登录页也需加载）、login 页本身
    '/((?!api|_next/static|_next/image|fonts|brand|favicon.ico|icon.svg|apple-icon.png|opengraph-image.png|manifest.webmanifest|login).*)',
  ],
};

export default auth((req) => {
  const isAuthed = !!req.auth;
  if (!isAuthed) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
});
