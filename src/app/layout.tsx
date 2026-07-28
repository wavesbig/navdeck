import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { THEME_SCRIPT_CODE } from '@/hooks/useTheme';
import { Providers } from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'NavDeck',
  description: '自托管个人导航站',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme="light" + inline color-scheme:light 作 SSR 默认值
    // inline style 让浏览器解析 HTML 时立即应用主题，不等外部 CSS 加载
    // 避免 FOUC：浏览器 UA 默认 color-scheme:light dark（按系统偏好），
    // 系统为 dark 时会先绘制黑背景，CSS 加载后才切到 light，造成闪烁
    // ThemeScript 在 hydration 前会按 localStorage 偏好同步覆盖 data-theme 与 color-scheme
    // suppressHydrationWarning：让 React 接受 DOM 实际值（被 inline script 改过）而非 SSR 输出
    <html
      lang="zh-CN"
      data-theme="light"
      style={{ colorScheme: 'light', backgroundColor: '#f1f1f1' }}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 主题初始化 inline script：hydration 前同步执行，避免明暗闪烁
            用 next/script 包装避免 React 19 「script in component」警告
            beforeInteractive 策略在 SSR 阶段注入 HTML，浏览器解析时同步执行 */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT_CODE }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
