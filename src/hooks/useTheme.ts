'use client';

import {useState, useEffect, useCallback} from 'react';
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

/**
 * 主题切换 hook
 *
 * - mode：用户偏好（'light' | 'dark' | 'system'），lazy initializer 从 localStorage 读取
 * - resolved：实际生效的明暗（mode='system' 时由系统偏好派生）
 * - setMode：切换主题，同步 localStorage + <html data-theme>
 *
 * 跨组件同步：监听 'theme-change' 事件（ThemeForm / FloatingToolbar 都会 dispatch）
 *
 * 注意：mode 不在 effect 里 setState，避免级联渲染；resolved 是 mode + systemPrefersDark 的派生值
 */
export function useTheme(initialMode: ThemeMode = 'system') {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return initialMode;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // 忽略 localStorage 读取失败
    }
    return initialMode;
  });

  // 系统明暗偏好（mode='system' 时决定 resolved）
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // resolved 是 mode + systemPrefersDark 的派生值
  const resolved = resolveMode(mode, systemPrefersDark);

  // 同步外部系统：localStorage + <html data-theme>（不在 effect 里 setState）
  useEffect(() => {
    syncHtmlAttr(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // 忽略写入失败
    }
  }, [mode, resolved]);

  // 监听系统明暗变化（在事件回调中 setState，合规）
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemPrefersDark(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // 监听跨组件触发的 'theme-change' 事件（来自 ThemeForm / FloatingToolbar）
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail;
      if (
        detail === 'light' ||
        detail === 'dark' ||
        detail === 'system'
      ) {
        setModeState(detail);
      }
    };
    window.addEventListener('theme-change', handler);
    return () => window.removeEventListener('theme-change', handler);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    // 广播给其他组件（ThemeForm / FloatingToolbar 都监听）
    window.dispatchEvent(
      new CustomEvent('theme-change', {detail: next})
    );
  }, []);

  return {mode, resolved, setMode};
}

/** hydration 前主题初始化 inline script 的字符串内容（供 ThemeScript.tsx 使用） */
export const THEME_SCRIPT_CODE = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var m=t==='dark'||t==='light'||t==='system'?t:'system';var r=m;if(m==='system'){r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',r);}catch(e){}})();`;
