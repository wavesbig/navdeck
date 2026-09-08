import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { THEME_SCRIPT_CODE } from '@/hooks/useTheme';
import { getBrandConfig } from '@/lib/brand';
import { normalizeFontSize } from '@/lib/font-size';
import { getUserPreference } from '@/lib/preferences';
import type { ThemeMode } from '@/types';
import { Providers } from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandConfig();
  return {
    title: brand.title,
    description: '自托管个人导航站',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rawTheme = await getUserPreference<unknown>('theme', 'system');
  const theme: ThemeMode =
    rawTheme === 'light' || rawTheme === 'dark' || rawTheme === 'system'
      ? rawTheme
      : 'system';
  const rawFontSize = await getUserPreference<unknown>('fontSize', 100);
  const fontSize = normalizeFontSize(rawFontSize);
  const isDark = theme === 'dark';
  // 仅显式 light/dark 由 SSR 输出主题属性；system 不输出任何明暗信息，
  // 交给 THEME_SCRIPT_CODE 在首帧前解析（localStorage → 系统偏好）。
  // 若 system 也强制输出 light，inline 脚本会采信该显式值并覆盖 localStorage，
  // 导致暗色系统用户白闪 + 「跟随系统」偏好被改写为 light。
  const explicitTheme =
    theme === 'dark' || theme === 'light' ? theme : undefined;

  return (
    // 显式主题由 SSR 直接输出，避免客户端拿到偏好后二次切换
    // inline style 让浏览器解析 HTML 时立即应用主题，不等外部 CSS 加载
    // system 实际明暗由 inline script 在首帧前同步（先 localStorage 后系统偏好）
    // suppressHydrationWarning：让 React 接受 DOM 实际值（被 inline script 改过）而非 SSR 输出
    <html
      lang="zh-CN"
      data-theme={explicitTheme}
      style={{
        colorScheme: explicitTheme,
        backgroundColor: isDark
          ? '#1b1b1b'
          : explicitTheme
            ? '#f1f1f1'
            : undefined,
        fontSize: `${fontSize}%`,
      }}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 主题初始化必须是普通同步脚本；next/script 会推入 __next_s 队列。 */}
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT_CODE }}
        />
      </head>
      <body
        className="min-h-full flex flex-col"
        // 某些浏览器扩展会在 hydration 前给 body 注入 data-* 属性
        // 例如 data-atm-ext-installed，允许这类非业务属性差异避免开发期误报
        suppressHydrationWarning
      >
        <Providers initialFontSize={fontSize} initialTheme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
