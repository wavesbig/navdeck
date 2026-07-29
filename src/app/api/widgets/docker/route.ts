import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import {
  getDockerResourceStats,
  getDockerStatus,
  isDockerAvailable,
} from '@/lib/docker';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Docker widget 数据 API
 * - GET: 返回容器状态 + 资源水位聚合
 */
export const GET = withAuth(async () => {
  const available = await isDockerAvailable();
  if (!available) {
    return NextResponse.json({
      available: false,
      status: { running: 0, total: 0, stopped: 0 },
      resource: {
        cpuPercent: 0,
        memoryPercent: 0,
        diskReadBytesPerSec: 0,
        diskWriteBytesPerSec: 0,
      },
    });
  }

  const [status, resource] = await Promise.all([
    getDockerStatus(),
    getDockerResourceStats(),
  ]);

  return NextResponse.json({ available: true, status, resource });
});
