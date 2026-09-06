import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import { cardBatchDeleteSchema } from '@/lib/validation';
import { DEFAULT_LUCKY_CONFIG } from '@/services/lucky';
import type { CardLuckyState, LuckyConfig } from '@/types';

/**
 * 卡片批量删除 API
 * - POST: 按 ids 批量删除（body: { ids: string[] }）
 *
 * Lucky 同步卡片删除后记 ruleId 到 deletedRuleIds（同单卡删除逻辑），
 * 防止下次同步把已删除的卡片拉回来。
 */
export const POST = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(cardBatchDeleteSchema, body);
  if (!parsed.ok) return parsed.response;
  const { ids } = parsed.data;

  const cards = await prisma.card.findMany({
    where: { id: { in: ids } },
    select: { id: true, lucky: true },
  });
  if (cards.length === 0) {
    return NextResponse.json({ error: '卡片不存在' }, { status: 404 });
  }

  await prisma.card.deleteMany({
    where: { id: { in: cards.map((c) => c.id) } },
  });

  // 若含 Lucky 同步卡片，记下 ruleId 到 deletedRuleIds
  // 失败不阻塞：最坏情况是下次同步拉回卡片，用户再删一次
  const luckyRuleIds = cards
    .map((c) => (c.lucky as unknown as CardLuckyState | null)?.ruleId)
    .filter((ruleId): ruleId is string => Boolean(ruleId));
  if (luckyRuleIds.length > 0) {
    try {
      const config = await getUserPreference<LuckyConfig>(
        'lucky',
        DEFAULT_LUCKY_CONFIG,
      );
      // Set 查重去重，避免循环内对数组的 O(n) includes
      const deletedRules = new Set(config.deletedRuleIds);
      for (const ruleId of luckyRuleIds) {
        deletedRules.add(ruleId);
      }
      if (deletedRules.size !== config.deletedRuleIds.length) {
        config.deletedRuleIds = [...deletedRules];
        await setUserPreference('lucky', config);
      }
    } catch (e) {
      console.error('记录 deletedRuleIds 失败', e);
    }
  }

  return NextResponse.json({ success: true, deleted: cards.length });
});
