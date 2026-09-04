import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import { prisma } from '@/lib/db';
import { listSearchEngines, toEngineConfig } from '@/lib/search-engines';
import { searchEngineFormSchema } from '@/lib/validation';

/**
 * 搜索引擎 API
 * - GET: 合并列表（内置 + 自定义，内置在前）
 * - POST: 创建自定义引擎（order 追加到自定义引擎末尾）
 */
export const GET = withAuth(async () => {
  const items = await listSearchEngines();
  return NextResponse.json({ items });
});

export const POST = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(searchEngineFormSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // order = 自定义引擎当前最大 order + 1（自定义段内追加）
  const maxOrder = await prisma.searchEngine.aggregate({
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const row = await prisma.searchEngine.create({
    data: {
      name: data.name,
      urlTemplate: data.urlTemplate,
      iconPath: data.iconPath,
      order,
    },
  });

  return NextResponse.json(toEngineConfig(row), { status: 201 });
});
