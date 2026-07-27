import type { Card, NetworkMode, ResolvedUrl } from '@/types';

/**
 * 网络模式与 URL 选择工具
 *
 * - auto: 优先外网（外网不可达时回退内网，需要探测）
 * - internal: 强制内网 URL
 * - external: 强制外网 URL
 */

/** 根据网络模式选择卡片最终跳转 URL（同步，不探测） */
export function resolveCardUrl(
  card: Pick<Card, 'internalUrl' | 'externalUrl'>,
  mode: NetworkMode,
): ResolvedUrl {
  switch (mode) {
    case 'internal':
      return { url: card.internalUrl, source: 'internal' };
    case 'external':
      return { url: card.externalUrl, source: 'external' };
    default:
      // auto 默认走外网，状态灯探测失败时前端可手动回退
      return { url: card.externalUrl, source: 'external' };
  }
}

/** 探测单个 URL 是否可达（3 秒超时，HEAD 方法，失败回退 GET） */
export async function probeUrl(
  url: string,
  timeoutMs = 3000,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // 先尝试 HEAD（节省流量），不支持再 GET
    let res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    if (res.status === 405 || res.status === 404) {
      // 某些服务不支持 HEAD，回退到 GET
      res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
      });
    }
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** 并发探测多个 URL，限制并发数避免请求风暴 */
export async function probeUrls(
  urls: string[],
  options?: { timeoutMs?: number; concurrency?: number },
): Promise<boolean[]> {
  const timeoutMs = options?.timeoutMs ?? 3000;
  const concurrency = options?.concurrency ?? 6;
  const results: boolean[] = new Array(urls.length).fill(false);

  let index = 0;
  async function worker() {
    while (index < urls.length) {
      const i = index++;
      results[i] = await probeUrl(urls[i], timeoutMs);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/** 根据 auto 模式探测结果决定最终 URL */
export function resolveAutoUrl(
  card: Pick<Card, 'internalUrl' | 'externalUrl'>,
  probeResults: { internal: boolean; external: boolean },
): ResolvedUrl {
  // 优先外网可达，其次内网，最后兜底外网
  if (probeResults.external) {
    return { url: card.externalUrl, source: 'external' };
  }
  if (probeResults.internal) {
    return { url: card.internalUrl, source: 'internal' };
  }
  return { url: card.externalUrl, source: 'external' };
}
