import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import {
  getDockerEngineInfo,
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
      status: { running: 0, total: 0, stopped: 0, runningNames: [] },
      resource: {
        cpuPercent: 0,
        memoryPercent: 0,
        diskReadBytesPerSec: 0,
        diskWriteBytesPerSec: 0,
      },
      engine: { images: 0, serverVersion: '', cpus: 0, memTotalBytes: 0 },
    });
  }

  const [status, resource, engine] = await Promise.all([
    getDockerStatus(),
    getDockerResourceStats(),
    getDockerEngineInfo(),
  ]);

  return NextResponse.json({ available: true, status, resource, engine });
});
