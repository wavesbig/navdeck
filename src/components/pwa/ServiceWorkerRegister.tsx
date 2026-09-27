'use client';

import { useToast } from '@astryxdesign/core/Toast';
import { useEffect } from 'react';

/**
 * 生产环境注册 Service Worker（public/sw.js）
 *
 * 开发环境不注册：SW 缓存会与 Turbopack 热更新打架，页面改了不生效。
 */
export function ServiceWorkerRegister() {
  const showToast = useToast();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    let notified = false;
    const notifyReady = () => {
      if (notified || !navigator.serviceWorker.controller) return;
      notified = true;
      showToast({ body: '新版本已就绪，刷新页面生效', type: 'info' });
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting) notifyReady();
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed') notifyReady();
          });
        });
      })
      .catch((error) => {
        console.warn('Service Worker 注册失败', error);
      });
  }, [showToast]);

  return null;
}
