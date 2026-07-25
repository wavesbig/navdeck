import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';
import {probeUrls, resolveAutoUrl} from '@/lib/network';
import type {CardStatus, CardStatusResult, NetworkMode} from '@/types';
import {getUserPreference} from '@/lib/preferences';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * 卡片状态灯批量探测
 *
 * - GET: 并发探测所有卡片，返回 CardStatusResult[]
 * - 探测 URL 根据 networkMode 选择：
 *   - internal: 只探测 internalUrl
 *   - external: 只探测 externalUrl
 *   - auto: 同时探测两个，外网优先
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const cards = await prisma.card.findMany({
    select: {id: true, internalUrl: true, externalUrl: true},
  });

  if (cards.length === 0) {
    return NextResponse.json({items: [] satisfies CardStatusResult[]});
  }

  const mode = await getUserPreference<NetworkMode>('networkMode', 'auto');

  // 构建探测任务列表
  type ProbeTask = {cardId: string; kind: 'internal' | 'external'; url: string};
  const tasks: ProbeTask[] = [];
  for (const card of cards) {
    if (mode === 'internal') {
      tasks.push({cardId: card.id, kind: 'internal', url: card.internalUrl});
    } else if (mode === 'external') {
      tasks.push({cardId: card.id, kind: 'external', url: card.externalUrl});
    } else {
      // auto: 探测两个
      tasks.push({cardId: card.id, kind: 'internal', url: card.internalUrl});
      tasks.push({cardId: card.id, kind: 'external', url: card.externalUrl});
    }
  }

  const urls = tasks.map((t) => t.url);
  const results = await probeUrls(urls, {timeoutMs: 3000, concurrency: 6});

  // 按 cardId 聚合
  const byCard = new Map<string, {internal?: boolean; external?: boolean}>();
  tasks.forEach((task, i) => {
    const entry = byCard.get(task.cardId) ?? {};
    entry[task.kind] = results[i];
    byCard.set(task.cardId, entry);
  });

  // 决定每个卡片最终状态
  const items: CardStatusResult[] = cards.map((card) => {
    const probes = byCard.get(card.id) ?? {};
    let status: CardStatus;

    if (mode === 'internal') {
      status = probes.internal ? 'online' : 'offline';
    } else if (mode === 'external') {
      status = probes.external ? 'online' : 'offline';
    } else {
      // auto: 任一可达即 online
      const resolved = resolveAutoUrl(card, {
        internal: probes.internal ?? false,
        external: probes.external ?? false,
      });
      // 探测失败两个都失败 -> offline；任一成功 -> online
      status = resolved.source === 'external' && probes.external
        ? 'online'
        : resolved.source === 'internal' && probes.internal
          ? 'online'
          : 'offline';
    }

    return {id: card.id, status};
  });

  return NextResponse.json({items});
}
