'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { ThemeMode } from '@/types';

const STORAGE_KEY = 'navdeck-theme';

/** 浏览器实际生效的明暗（基于 mode + 系统偏好解析） */
export type ResolvedTheme = 'light' | 'dark';

/** 把 ThemeMode 解析为 ResolvedTheme（'system' → 跟随 matchMedia） */
function resolveMode(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (mode !== 'system') return mode;
  return systemPrefersDark ? 'dark' : 'light';
}

/** Astryx neutral 主题的 --color-background-body 值（与 theme-neutral/theme.css 保持同步）
 * 用于 inline style 设置 html 背景色，避免外部 CSS 加载前的 FOUC */
const THEME_BG: Record<ResolvedTheme, string> = {
  light: '#f1f1f1',
  dark: '#1b1b1b',
};

/** 同步 <html data-theme>、inline color-scheme 与 background-color
 *
 * 同时设置 inline style：
 * - colorScheme：影响浏览器原生 UI（滚动条等）与 light-dark() 函数解析
 * - backgroundColor：避免外部 CSS 加载前，浏览器用系统 dark 画布显示黑背景
 *   （color-scheme:light 在某些浏览器/场景下不足以覆盖系统画布颜色）
 */
function syncHtmlAttributes(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.setAttribute('data-theme', resolved);
  el.style.colorScheme = resolved;
  el.style.backgroundColor = THEME_BG[resolved];
}

/** 读取客户端 localStorage 中的主题偏好 */
function readClientMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // 忽略 localStorage 读取失败
  }
  return 'system';
}

/** 读取客户端系统明暗偏好 */
function readClientSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * useSyncExternalStore 的订阅函数
 *
 * 监听三类事件：
 * - 'theme-change'：跨组件广播（FloatingToolbar/ThemeForm dispatch）
 * - 'storage'：跨 tab 同步（同源其他 tab 修改 localStorage）
 * - matchMedia 'change'：系统明暗偏好变化
 */
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('theme-change', callback);
  window.addEventListener('storage', callback);

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);

  return () => {
    window.removeEventListener('theme-change', callback);
    window.removeEventListener('storage', callback);
    mql.removeEventListener('change', callback);
  };
}

/** 客户端快照：mode（从 localStorage） */
function getModeSnapshot(): ThemeMode {
  return readClientMode();
}

/** 客户端快照：systemPrefersDark（从 matchMedia） */
function getSystemDarkSnapshot(): boolean {
  return readClientSystemDark();
}

/**
 * 主题切换 hook（SSR 安全，基于 useSyncExternalStore）
 *
 * 设计：
 * - 服务端和客户端首次 hydration 都用 getServerSnapshot（传入的初始偏好），保证输出一致
 * - 挂载后 React 自动切换到 getSnapshot（localStorage/matchMedia 实际值）并触发重渲染
 * - 实际明暗（<html data-theme>）由 ThemeScript 的 inline script 在 hydration 前设置
 *   React state 仅用于驱动 UI（IconButton 图标/标签），不参与初始 DOM 同步
 *
 * useSyncExternalStore 的优势：
 * - 无需在 effect 里 setState（符合 react-hooks/set-state-in-effect 规则）
 * - 服务端/客户端首次渲染输出一致（getServerSnapshot 同时用于两者）
 * - 跨 tab 同步免费（订阅 'storage' 事件）
 *
 * 跨组件同步：FloatingToolbar/ThemeForm 调 setMode 后 dispatch 'theme-change'，
 * subscribe 监听到事件并触发 re-render，所有 useTheme 消费者同步更新
 */
export function useTheme(initialMode: ThemeMode = 'system') {
  const mode = useSyncExternalStore(
    subscribe,
    getModeSnapshot,
    () => initialMode,
  );
  const systemPrefersDark = useSyncExternalStore(
    subscribe,
    getSystemDarkSnapshot,
    () => false,
  );

  const resolved = resolveMode(mode, systemPrefersDark);

  // 同步 <html data-theme>（mode 变化时）
  // 不再 sync localStorage — setMode 已写 localStorage，这里只负责 DOM 属性
  useSyncHtmlTheme(resolved);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 忽略写入失败
    }
    syncHtmlAttributes(resolveMode(next, readClientSystemDark()));
    // 广播给所有 useTheme 消费者
    window.dispatchEvent(new CustomEvent('theme-change', { detail: next }));
  }, []);

  return { mode, resolved, setMode };
}

/**
 * 同步 <html data-theme> 属性（mode/resolved 变化时）
 *
 * 用 useEffect 同步外部 DOM 状态，不调用 setState，符合 lint 规则
 */
function useSyncHtmlTheme(resolved: ResolvedTheme) {
  useEffect(() => {
    syncHtmlAttributes(resolved);
  }, [resolved]);
}

/** hydration 前主题初始化 inline script 的字符串内容（供 RootLayout 使用）
 *
 * SSR 已输出数据库显式主题（light/dark），此时保留该首帧；
 * 同时把显式主题写入 localStorage，保证 hydration 后 useTheme 不回落到 system。
 */
export const THEME_SCRIPT_CODE = `(function(){try{var el=document.documentElement;var s=el.getAttribute('data-theme');if(s==='dark'||s==='light'){localStorage.setItem('${STORAGE_KEY}',s);el.style.colorScheme=s;el.style.backgroundColor=s==='dark'?'#1b1b1b':'#f1f1f1';return;}var t=localStorage.getItem('${STORAGE_KEY}');var m=t==='dark'||t==='light'||t==='system'?t:'system';var r=m;if(m==='system'){r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}el.setAttribute('data-theme',r);el.style.colorScheme=r;el.style.backgroundColor=r==='dark'?'#1b1b1b':'#f1f1f1';}catch(e){}})();`;
