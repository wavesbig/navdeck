'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'widget-bar-visible';
const CHANGE_EVENT = 'widget-bar-toggle';

/** 读取 widget 横条显隐；没有存储值时默认显示 */
function readVisible(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function writeVisible(visible: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(visible));
  } catch {
    // 忽略 localStorage 写入失败
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: visible }));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getServerSnapshot() {
  return true;
}

/**
 * widget 横条显隐的唯一数据源。
 *
 * FloatingToolbar 和 WidgetBar 共用同一份 localStorage 快照，
 * 避免各自维护 state 后刷新时按钮状态与实际显隐不一致。
 */
export function useWidgetBarVisibility() {
  const visible = useSyncExternalStore(
    subscribe,
    readVisible,
    getServerSnapshot,
  );

  const setVisible = useCallback((next: boolean) => {
    writeVisible(next);
  }, []);

  return { visible, setVisible } as const;
}
