import { NextResponse } from 'next/server';
import { validateBody, withAuth } from '@/lib/api';
import {
  addManualOccupiedPorts,
  getPortStatus,
  getServerIp,
  getSuggestedHostIps,
  isLocalPortAvailable,
  isValidIpv4,
  parsePortRangeInput,
  removeManualOccupiedPort,
} from '@/lib/ports';
import { getUserPreference } from '@/lib/preferences';
import { manualOccupiedPortSchema } from '@/lib/validation';

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

  const [status, customIpPref, suggestedIps] = await Promise.all([
    getPortStatus(startPort),
    getUserPreference<string>('portCustomIp', ''),
    getSuggestedHostIps(),
  ]);

  const customIp = (customIpPref || '').trim();

  // 探测请求来源 Host
  const hostHeader = req.headers.get('host') ?? '';
  const requestHost = hostHeader.split(':')[0] || '';
  const isLocal =
    !requestHost || requestHost === 'localhost' || requestHost === '127.0.0.1';

  // 决定最终推荐或展示的 hostIp
  let hostIp = customIp;
  if (!hostIp) {
    if (isValidIpv4(requestHost) && !isLocal) {
      // 客户端直接通过真实 IP 访问（如 http://192.168.1.5:3000）
      hostIp = requestHost;
    } else if (suggestedIps.length > 0) {
      // 反向代理域名（如 nav.example.com）或 localhost：优先采用首个推荐内网 IP
      hostIp = suggestedIps[0].ip;
    } else {
      hostIp = isLocal ? getServerIp() : requestHost;
    }
  }

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
          occupiedBy:
            match.type === 'manual' ? `手动标记: ${match.name}` : match.name,
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
      customIp,
      suggestedIps,
      checkResult,
    },
    { headers: NO_STORE_HEADERS },
  );
});

/**
 * 手动标记端口为已占用（支持单个、列表或黑名单区间输入）
 * POST /api/ports
 */
export const POST = withAuth(async (_session, req) => {
  const body = await req.json();
  const parsed = validateBody(manualOccupiedPortSchema, body);
  if (!parsed.ok) return parsed.response;

  const { port, ports, portInput, name, note, protocol } = parsed.data;
  const targetPorts: number[] = [];

  if (typeof port === 'number') {
    targetPorts.push(port);
  }
  if (Array.isArray(ports)) {
    targetPorts.push(...ports);
  }
  if (portInput) {
    targetPorts.push(...parsePortRangeInput(portInput));
  }

  const uniquePorts = Array.from(new Set(targetPorts)).filter(
    (p) => p >= 1 && p <= 65535,
  );

  if (uniquePorts.length === 0) {
    return NextResponse.json({ error: '未解析到有效端口' }, { status: 400 });
  }

  const finalName = (name || '').trim() || '手动黑名单';

  await addManualOccupiedPorts(
    uniquePorts.map((p) => ({
      port: p,
      name: finalName,
      note: note?.trim(),
      protocol: protocol?.trim() || 'tcp',
    })),
  );

  return NextResponse.json({
    success: true,
    count: uniquePorts.length,
    ports: uniquePorts,
  });
});

/**
 * 取消手动标记占用端口（移出黑名单）
 * DELETE /api/ports?port=8001
 */
export const DELETE = withAuth(async (_session, req) => {
  const { searchParams } = new URL(req.url);
  const targetPorts: number[] = [];

  const portParam = searchParams.get('port');
  if (portParam) {
    const p = Number.parseInt(portParam, 10);
    if (!Number.isNaN(p)) targetPorts.push(p);
  }

  const portInputParam = searchParams.get('portInput');
  if (portInputParam) {
    targetPorts.push(...parsePortRangeInput(portInputParam));
  }

  try {
    const body = await req.json();
    if (typeof body?.port === 'number') targetPorts.push(body.port);
    if (Array.isArray(body?.ports)) targetPorts.push(...body.ports);
    if (typeof body?.portInput === 'string') {
      targetPorts.push(...parsePortRangeInput(body.portInput));
    }
  } catch {}

  const uniquePorts = Array.from(new Set(targetPorts)).filter(
    (p) => p >= 1 && p <= 65535,
  );

  if (uniquePorts.length === 0) {
    return NextResponse.json({ error: '端口参数不合法' }, { status: 400 });
  }

  for (const p of uniquePorts) {
    await removeManualOccupiedPort(p);
  }

  return NextResponse.json({ success: true, count: uniquePorts.length });
});
