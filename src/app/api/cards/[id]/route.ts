import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { getUserPreference, setUserPreference } from '@/lib/preferences';
import { cardUpdateSchema } from '@/lib/validation';
import { DEFAULT_LUCKY_CONFIG } from '@/services/lucky';
import type { CardLuckyState, LuckyConfig } from '@/types';

/**
 * 单卡片 API
 * - GET: 详情
 * - PATCH: 更新
 * - DELETE: 删除
 */
export const GET = withAuth(async (_session, _req, ctx) => {
  const { id } = await ctx.params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!card) {
    return NextResponse.json({ error: '卡片不存在' }, { status: 404 });
  }

  return NextResponse.json(card);
});

export const PATCH = withAuth(async (_session, req, ctx) => {
  const [{ id }, body] = await Promise.all([ctx.params, req.json()]);
  const parsed = validateBody(cardUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // 校验分类存在（如果传了非空 categoryId）
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      return NextResponse.json(
        {
          error: '分类不存在',
          fieldErrors: { categoryId: ['分类不存在'] },
        },
        { status: 400 },
      );
    }
  }

  const card = await prisma.card.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.internalUrl !== undefined && { internalUrl: data.internalUrl }),
      ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.description !== undefined && {
        description: data.description || null,
      }),
      ...(data.categoryId !== undefined && {
        categoryId: data.categoryId || null,
      }),
    },
    include: { category: true },
  });

  return NextResponse.json(card);
});

export const DELETE = withAuth(async (_session, _req, ctx) => {
  const { id } = await ctx.params;

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) {
    return NextResponse.json({ error: '卡片不存在' }, { status: 404 });
  }

  // 先删卡片，再更新偏好（确保删卡片成功后才记录 ruleId）
  await prisma.card.delete({ where: { id } });

  // 若为 Lucky 同步卡片，记下 ruleId 到 deletedRuleIds
  // 失败不阻塞：最坏情况是下次同步拉回卡片，用户再删一次
  if (card.lucky) {
    const state = card.lucky as unknown as CardLuckyState;
    if (state.ruleId) {
      try {
        const config = await getUserPreference<LuckyConfig>(
          'lucky',
          DEFAULT_LUCKY_CONFIG,
        );
        if (!config.deletedRuleIds.includes(state.ruleId)) {
          config.deletedRuleIds.push(state.ruleId);
          await setUserPreference('lucky', config);
        }
      } catch (e) {
        console.error('记录 deletedRuleIds 失败', e);
      }
    }
  }

  return NextResponse.json({ success: true });
});
