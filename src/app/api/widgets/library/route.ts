import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import type { WidgetKey } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Widget 库（可添加的 widget 类型元信息）
 *
 * - GET: 返回 4 种 widget 类型的元信息（key / label / description / icon）
 *   前端 widget 库弹窗用此渲染选项卡片
 */
const LIBRARY: {
  key: WidgetKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'nas-status',
    label: 'NAS 状态',
    description: 'Docker 容器运行状态总览',
  },
  {
    key: 'resource-gauge',
    label: '资源水位',
    description: 'CPU / 内存 / 磁盘 IO 实时水位',
  },
  {
    key: 'countdown',
    label: '倒数日',
    description: '距离未来的重要日子还有多少天',
  },
  {
    key: 'countup',
    label: '正数日',
    description: '过去的重要日子已经过去多少天',
  },
];

export const GET = withAuth(async () => {
  return NextResponse.json({ items: LIBRARY });
});
