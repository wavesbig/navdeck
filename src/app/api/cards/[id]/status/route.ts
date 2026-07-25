import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {auth} from '@/lib/auth';
import {probeUrl, resolveAutoUrl} from '@/lib/network';
import type {CardStatus, CardStatusResult, NetworkMode} from '@/types';
import {getUserPreference} from '@/lib/preferences';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

/**
 * 单卡片状态探测（点击卡片时触发）
 *
 * - GET /api/cards/[id]/status: 探测单个卡片，返回最新状态
 */
export async function GET(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const {id} = await params;
  const card = await prisma.card.findUnique({
    where: {id},
    select: {id: true, internalUrl: true, externalUrl: true},
  });

  if (!card) {
    return NextResponse.json({error: '卡片不存在'}, {status: 404});
  }

  const mode = await getUserPreference<NetworkMode>('networkMode', 'auto');

  let status: CardStatus;

  if (mode === 'internal') {
    const ok = await probeUrl(card.internalUrl, 3000);
    status = ok ? 'online' : 'offline';
  } else if (mode === 'external') {
    const ok = await probeUrl(card.externalUrl, 3000);
    status = ok ? 'online' : 'offline';
  } else {
    // auto: 并行探测两个 URL
    const [internal, external] = await Promise.all([
      probeUrl(card.internalUrl, 3000),
      probeUrl(card.externalUrl, 3000),
    ]);
    const resolved = resolveAutoUrl(card, {internal, external});
    status =
      (resolved.source === 'external' && external) ||
      (resolved.source === 'internal' && internal)
        ? 'online'
        : 'offline';
  }

  const result: CardStatusResult = {id: card.id, status};
  return NextResponse.json(result);
}
