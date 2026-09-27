/* NavDeck Service Worker：安装体验 + 静态资源缓存 + 离线兜底 */

const CACHE = 'navdeck-v2';
const OFFLINE_URL = '/offline.html';

// 仅带内容 hash 的资源适合缓存优先；稳定路径用 SWR，保证部署后能更新
const CACHE_FIRST_PREFIXES = ['/_next/static/'];
const SWR_PREFIXES = [
  '/_next/image',
  '/icons/',
  '/wallpapers/',
  '/brand/',
  '/fonts/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const shell = await fetch(OFFLINE_URL, { cache: 'reload' });
      if (shell.ok) await cache.put(OFFLINE_URL, shell.clone());
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const stale = names.filter((n) => n !== CACHE);
      const clients = await self.clients.matchAll({ type: 'window' });
      // 旧页面可能还在加载旧 chunk，等没有客户端时再清理
      if (clients.length === 0) {
        await Promise.all(stale.map((n) => caches.delete(n)));
      }
      await self.clients.claim();
    })(),
  );
});

function isCacheable(res) {
  if (res.status !== 200) return false;
  const policy = res.headers.get('cache-control') ?? '';
  if (/(?:^|,\s*)(?:no-store|no-cache|private)\b/i.test(policy)) return false;
  const type = res.headers.get('content-type') ?? '';
  return !type.startsWith('text/html');
}

/** 缓存优先：命中直接返回，未命中拉取并写入缓存 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.status === 200 && res.headers.get('content-type')?.startsWith('text/html')) {
      return new Response('离线且资源不可用', { status: 503 });
    }
    if (isCacheable(res)) await cache.put(request, res.clone());
    return res;
  } catch {
    return new Response('离线且无缓存', { status: 503 });
  }
}

/** 稳定静态资源：先回缓存，再后台更新 */
async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const update = (async () => {
    try {
      const res = await fetch(request);
      if (isCacheable(res)) await cache.put(request, res.clone());
      return res;
    } catch {
      return new Response('离线且无缓存', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })();

  if (hit) {
    event.waitUntil(update);
    return hit;
  }
  return update;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // 版本化静态资源：缓存优先
  if (CACHE_FIRST_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 稳定静态资源：SWR
  if (SWR_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  // 页面导航：网络优先，离线回退无依赖兜底页
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return offline ?? new Response('离线且无缓存', { status: 503 });
        }
      })(),
    );
  }
});
