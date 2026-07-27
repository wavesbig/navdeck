'use client';

import {useSyncExternalStore, useCallback, useEffect} from 'react';
import type {ThemeMode} from '@/types';

const STORAGE_KEY = 'navdeck-theme';

/** 浏览器实际生效的明暗（基于 mode + 系统偏好解析） */
export type ResolvedTheme = 'light' | 'dark';

/** 把 ThemeMode 解析为 ResolvedTheme（'system' → 跟随 matchMedia） */
function resolveMode(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode !== 'system') return mode;
  return systemPrefersDark ? 'dark' : 'light';
}

/** 同步 <html data-theme> 属性（Astryx 通过它驱动 color-scheme） */
function syncHtmlAttr(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
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

/** 服务端快照：固定 'system'（SSR + 客户端首次 hydration 都用这个，避免 mismatch） */
function getModeServerSnapshot(): ThemeMode {
  return 'system';
}

/** 客户端快照：systemPrefersDark（从 matchMedia） */
function getSystemDarkSnapshot(): boolean {
  return readClientSystemDark();
}

/** 服务端快照：固定 false */
function getSystemDarkServerSnapshot(): boolean {
  return false;
}

/**
 * 主题切换 hook（SSR 安全，基于 useSyncExternalStore）
 *
 * 设计：
 * - 服务端和客户端首次 hydration 都用 getServerSnapshot（mode='system'），保证输出一致
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
export function useTheme() {
  const mode = useSyncExternalStore(subscribe, getModeSnapshot, getModeServerSnapshot);
  const systemPrefersDark = useSyncExternalStore(subscribe, getSystemDarkSnapshot, getSystemDarkServerSnapshot);

  const resolved = resolveMode(mode, systemPrefersDark);

  // 同步 <html data-theme>（mode 变化时）
  // 不再 sync localStorage — setMode 已写 localStorage，这里只负责 DOM 属性
  useUpdateHtmlTheme(resolved);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 忽略写入失败
    }
    syncHtmlAttr(resolveMode(next, readClientSystemDark()));
    // 广播给所有 useTheme 消费者
    window.dispatchEvent(
      new CustomEvent('theme-change', {detail: next})
    );
  }, []);

  return {mode, resolved, setMode};
}

/**
 * 同步 <html data-theme> 属性（mode/resolved 变化时）
 *
 * 用 useEffect 同步外部 DOM 状态，不调用 setState，符合 lint 规则
 */
function useUpdateHtmlTheme(resolved: ResolvedTheme) {
  useEffect(() => {
    syncHtmlAttr(resolved);
  }, [resolved]);
}

/** hydration 前主题初始化 inline script 的字符串内容（供 ThemeScript.tsx 使用） */
export const THEME_SCRIPT_CODE = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var m=t==='dark'||t==='light'||t==='system'?t:'system';var r=m;if(m==='system'){r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',r);}catch(e){}})();`;
