import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { WIDGET_REGISTRY, type WidgetKey } from '@/lib/widgets/registry';

export const dynamic = 'force-dynamic';

/**
 * Widget 库（可添加的 widget 类型元信息）
 *
 * - GET: 返回全部 widget 类型的元信息（key / label / description），
 *   元数据从 widget 注册表派生（单一来源）
 *   前端 widget 库弹窗用此渲染选项卡片
 */
export const GET = withAuth(async () => {
  const items = (Object.keys(WIDGET_REGISTRY) as WidgetKey[]).map((key) => ({
    key,
    label: WIDGET_REGISTRY[key].label,
    description: WIDGET_REGISTRY[key].description,
  }));
  return NextResponse.json({ items });
});
