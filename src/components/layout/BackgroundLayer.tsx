'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { findWallpaper } from '@/lib/wallpaper-utils';
import type { Wallpaper, WallpaperPreferences } from '@/types';

interface BackgroundLayerProps {
  wallpapers: Wallpaper[];
  preferences: WallpaperPreferences;
}

/**
 * 客户端挂载标志
 *
 * 为什么需要这个？
 * - useTheme() 基于 useSyncExternalStore，SSR + 首次 hydration 用
 *   getServerSnapshot（mode='system', systemPrefersDark=false），
 *   解析出 resolved='light'。
 * - 挂载后切换到客户端快照（真实 mode + 真实 systemPrefersDark）。
 * - 如果 SSR 渲染 light 壁纸，客户端首次 hydration 也必须输出 light，
 *   否则 hydration mismatch，div 被 React 丢弃重建。
 *
 * 方案：SSR 和首次 hydration 都返回 null（不渲染壁纸），挂载后
 * 才渲染。这样无 mismatch，且客户端能正确响应系统主题变化。
 * - useTheme 的 useSyncExternalStore 订阅 matchMedia 'change' 事件，
 *   系统切换 light/dark 时会自动 re-render，壁纸跟着切换。
 * - 首屏无壁纸也能用，有 html 的 theme background-color 兜底。
 */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * 主页背景层
 *
 * 渲染一个 fixed 定位 div 覆盖整个视口作为背景层：
 * - 不依赖 <html> 的 background（避免与浏览器主题扩展、useTheme 同步、
 *   Astryx 重置样式等冲突——之前直接设置 html 的 background-image 时
 *   视觉上不显示，疑似浏览器扩展干扰 html 元素背景）
 * - fixed + inset-0 + -z-10：覆盖整个视口，位于内容之下
 * - AppShell 内部 main 元素已通过 globals.css 设为透明，让背景层透出
 * - 50% 黑/白遮罩叠加在壁纸之上，保证前景内容可读性
 * - 无壁纸时返回 null，回退到主题默认背景色
 */
export function BackgroundLayer({
  wallpapers,
  preferences,
}: BackgroundLayerProps) {
  const mounted = useMounted();
  const { resolved } = useTheme();

  // SSR 或首次 hydration 前不渲染：
  // - 服务端不知道客户端系统主题，渲染的壁纸一定不对
  // - 挂载后 useTheme 切换到客户端快照，resolved 正确响应系统主题
  if (!mounted) {
    return null;
  }

  // 一张图适配两种主题（light/dark 共用），只读单个 wallpaper 字段
  const wallpaper = findWallpaper(wallpapers, preferences.wallpaper);

  if (!wallpaper) {
    return null;
  }

  const overlay =
    resolved === 'dark'
      ? 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))'
      : 'linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5))';

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-fixed pointer-events-none"
      style={{
        backgroundImage: `${overlay}, url(${wallpaper.path})`,
      }}
    />
  );
}
