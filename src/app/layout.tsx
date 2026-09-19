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
  // 域名部署时用 AUTH_URL 修正社交分享图片地址；未设置时显式兜底
  // localhost:3000（与 Next.js 隐式回落同值），消除构建期 metadataBase 警告
  let metadataBase: URL;
  try {
    metadataBase = new URL(process.env.AUTH_URL ?? 'http://localhost:3000');
  } catch {
    // AUTH_URL 配置非法时兜底 localhost，不阻断页面渲染
    metadataBase = new URL('http://localhost:3000');
  }
  return {
    metadataBase,
    title: brand.title,
    description: '自托管个人导航站',
    // 强制 360 系双核浏览器使用 webkit 极速内核，避免云规则切到 IE 兼容模式
    other: {
      renderer: 'webkit',
    },
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
        {/* 入场动画会话门控：首访播放一次，会话内二次访问标记 data-entered 直接呈现 */}
        <script
          id="entrance-gate"
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(sessionStorage.getItem('navdeck-launched')==='1'){document.documentElement.dataset.entered='1';}sessionStorage.setItem('navdeck-launched','1');}catch(e){}})();",
          }}
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
