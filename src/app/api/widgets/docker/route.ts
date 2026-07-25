import {NextResponse} from 'next/server';
import {auth} from '@/lib/auth';
import {getDockerStatus, getDockerResourceStats, isDockerAvailable} from '@/lib/docker';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Docker widget 数据 API
 * - GET: 返回容器状态 + 资源水位聚合
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({error: '未登录'}, {status: 401});
  }

  const available = await isDockerAvailable();
  if (!available) {
    return NextResponse.json({
      available: false,
      status: {running: 0, total: 0, stopped: 0},
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

  return NextResponse.json({available: true, status, resource});
}
