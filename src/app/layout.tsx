import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeScript } from '@/hooks/ThemeScript';
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
    // data-theme="light" 仅作 SSR 默认值，客户端 hydration 前 ThemeScript 会立即覆盖
    // suppressHydrationWarning：inline script 在 hydration 前改了 data-theme，
    // 让 React 接受 DOM 值而非 SSR 输出（Next.js 16 推荐模式）
    <html
      lang="zh-CN"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
