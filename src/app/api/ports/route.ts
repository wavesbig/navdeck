import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getPortStatus, getServerIp, isLocalPortAvailable } from '@/lib/ports';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

/**
 * 端口速查与推荐 API
 * GET /api/ports?startPort=8000&checkPort=8080
 */
export const GET = withAuth(async (_session, req) => {
  const { searchParams } = new URL(req.url);
  const startPortParam = searchParams.get('startPort');
  const checkPortParam = searchParams.get('checkPort');

  let startPort = 8000;
  if (startPortParam) {
    const parsed = Number.parseInt(startPortParam, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 65535) {
      startPort = parsed;
    }
  }

  const status = await getPortStatus(startPort);

  // 探测请求来源 Host，如来自 localhost 则用服务器真实局域网网卡 IP
  const hostHeader = req.headers.get('host') ?? '';
  const requestHost = hostHeader.split(':')[0] || '';
  const isLocal =
    !requestHost || requestHost === 'localhost' || requestHost === '127.0.0.1';
  const hostIp = isLocal ? getServerIp() : requestHost;

  let checkResult: {
    port: number;
    isAvailable: boolean;
    occupiedBy?: string;
  } | null = null;
  if (checkPortParam) {
    const checkPort = Number.parseInt(checkPortParam, 10);
    if (!Number.isNaN(checkPort) && checkPort >= 1 && checkPort <= 65535) {
      const match = status.occupiedPorts.find((p) => p.port === checkPort);
      if (match) {
        checkResult = {
          port: checkPort,
          isAvailable: false,
          occupiedBy: match.name,
        };
      } else {
        const isFree = await isLocalPortAvailable(checkPort);
        checkResult = {
          port: checkPort,
          isAvailable: isFree,
          occupiedBy: isFree ? undefined : '本地系统进程',
        };
      }
    }
  }

  return NextResponse.json(
    {
      ...status,
      hostIp,
      checkResult,
    },
    { headers: NO_STORE_HEADERS },
  );
});
