import net from 'node:net';
import os from 'node:os';
import { getDocker, isDockerAvailable } from '@/lib/docker';

import type {
  HostIpSuggestion,
  LuckyConfig,
  ManualOccupiedPort,
  OccupiedPort,
  PortStatusResult,
} from '@/types';

export type {
  HostIpSuggestion,
  ManualOccupiedPort,
  OccupiedPort,
  PortStatusResult,
};

/**
 * 校验是否为合法的标准 IPv4 地址
 */
export function isValidIpv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number.parseInt(p, 10);
    return !Number.isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

/**
 * 判断是否为局域网私有 IPv4 地址（192.168.x.x / 10.x.x.x / 172.16-31.x.x）
 */
export function isLanIpv4(ip: string): boolean {
  if (!isValidIpv4(ip)) return false;
  const parts = ip.trim().split('.');
  const nums = parts.map((n) => Number.parseInt(n, 10));

  // 10.0.0.0/8
  if (nums[0] === 10) return true;
  // 172.16.0.0/12
  if (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31) return true;
  // 192.168.0.0/16
  if (nums[0] === 192 && nums[1] === 168) return true;
  return false;
}

/**
 * 获取宿主机真实局域网 IPv4 地址（排除 loopback 与 docker0 等内部虚拟网卡）
 */
export function getServerIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const [name, ifaceList] of Object.entries(interfaces)) {
      if (!ifaceList) continue;
      // 忽略 docker0、veth、br- 等虚拟网桥
      if (/^(docker|veth|br-|cni|flannel)/i.test(name)) continue;

      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          // 优先 192.168 或 10 或 172.16-31 内网网段
          if (
            iface.address.startsWith('192.168.') ||
            iface.address.startsWith('10.') ||
            iface.address.startsWith('172.')
          ) {
            return iface.address;
          }
        }
      }
    }

    // 兜底查找任意非内部 IPv4
    for (const [name, ifaceList] of Object.entries(interfaces)) {
      if (!ifaceList) continue;
      if (/^(docker|veth|br-|cni|flannel)/i.test(name)) continue;
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {
    // 忽略异常
  }
  return '127.0.0.1';
}

/**
 * 从 URL 中提取端口号
 * 例如：http://192.168.1.100:8080/path -> 8080
 * 没有显式端口时返回 null（不猜测 80/443，避免产生歧义）
 */
export function extractPortFromUrl(urlStr: string): number | null {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const trimmed = urlStr.trim();
  // 匹配末尾或路径前的 :port
  const portMatch = trimmed.match(/:(\d+)(?:[/?#]|$)/);
  if (portMatch?.[1]) {
    const p = Number.parseInt(portMatch[1], 10);
    if (!Number.isNaN(p) && p > 0 && p <= 65535) {
      return p;
    }
  }

  try {
    const fullUrl = trimmed.includes('://') ? trimmed : `http://${trimmed}`;
    const parsed = new URL(fullUrl);
    if (parsed.port) {
      const p = Number.parseInt(parsed.port, 10);
      if (!Number.isNaN(p) && p > 0 && p <= 65535) {
        return p;
      }
    }
  } catch {
    // 忽略异常
  }
  return null;
}

function testListen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, host);
  });
}

/**
 * 快速检查本地 TCP 端口是否被系统进程占用
 * 依次测试 0.0.0.0 与 127.0.0.1，防范因 Windows/Linux 监听 loopback 导致 0.0.0.0 漏判的漏洞
 */
export async function isLocalPortAvailable(port: number): Promise<boolean> {
  const availableOnAll = await testListen(port, '0.0.0.0');
  if (!availableOnAll) return false;

  const availableOnLoopback = await testListen(port, '127.0.0.1');
  if (!availableOnLoopback) return false;

  return true;
}

/**
 * 获取 Docker 容器映射的端口列表
 */
export async function getDockerOccupiedPorts(): Promise<OccupiedPort[]> {
  try {
    const docker = getDocker();
    if (!docker) return [];

    const containers = await docker.listContainers({ all: true });
    const result: OccupiedPort[] = [];

    for (const c of containers) {
      const containerName = (c.Names[0] ?? 'unnamed').replace(/^\//, '');
      const status = c.State;

      for (const p of c.Ports) {
        if (p.PublicPort) {
          result.push({
            port: p.PublicPort,
            type: 'docker',
            name: containerName,
            status,
            protocol: p.Type,
          });
        }
      }
    }
    return result;
  } catch (err) {
    console.warn('获取 Docker 端口失败:', err);
    return [];
  }
}

/**
 * 获取 NavDeck 卡片中使用的端口列表
 */
export async function getCardOccupiedPorts(): Promise<OccupiedPort[]> {
  try {
    const { prisma } = await import('@/lib/db');
    const cards = await prisma.card.findMany({
      select: {
        id: true,
        name: true,
        internalUrl: true,
        externalUrl: true,
      },
    });

    const result: OccupiedPort[] = [];
    for (const card of cards) {
      const internalPort = extractPortFromUrl(card.internalUrl);
      if (internalPort) {
        result.push({
          port: internalPort,
          type: 'card',
          name: card.name,
          url: card.internalUrl,
        });
      }

      const externalPort = extractPortFromUrl(card.externalUrl);
      if (externalPort && externalPort !== internalPort) {
        result.push({
          port: externalPort,
          type: 'card',
          name: `${card.name} (外网)`,
          url: card.externalUrl,
        });
      }
    }
    return result;
  } catch (err) {
    console.warn('获取卡片端口失败:', err);
    return [];
  }
}

/**
 * 解析端口输入字符串，支持单个端口、逗号分隔、端口区间（如 "8001", "8001,8002", "8000-8005"）
 */
export function parsePortRangeInput(input: string): number[] {
  if (!input || typeof input !== 'string') return [];
  const parts = input.split(/[,，\s]+/);
  const ports = new Set<number>();

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // 区间匹配，如 8000-8005
    const rangeMatch = trimmed.match(/^(\d{1,5})\s*[-~至]\s*(\d{1,5})$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      if (start >= 1 && end <= 65535 && start <= end) {
        // 单次区间限制最多 500 个端口，防止滥用
        const maxSpan = Math.min(end, start + 500);
        for (let p = start; p <= maxSpan; p++) {
          ports.add(p);
        }
      }
      continue;
    }

    // 单个端口匹配
    const p = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(p) && p >= 1 && p <= 65535) {
      ports.add(p);
    }
  }

  return Array.from(ports).sort((a, b) => a - b);
}

/**
 * 获取手动标记为占用的端口列表
 */
export async function getManualOccupiedPorts(): Promise<OccupiedPort[]> {
  try {
    const { getUserPreference } = await import('@/lib/preferences');
    const list = await getUserPreference<ManualOccupiedPort[]>(
      'manualOccupiedPorts',
      [],
    );
    if (!Array.isArray(list)) return [];
    const result: OccupiedPort[] = [];
    for (const item of list) {
      if (
        item &&
        typeof item.port === 'number' &&
        item.port >= 1 &&
        item.port <= 65535
      ) {
        result.push({
          port: item.port,
          type: 'manual',
          name: item.name?.trim() || '手动黑名单',
          note: item.note,
          protocol: item.protocol || 'tcp',
        });
      }
    }
    return result;
  } catch (err) {
    console.warn('获取手动标记端口失败:', err);
    return [];
  }
}

/**
 * 批量新增或更新手动标记端口（黑名单）
 */
export async function addManualOccupiedPorts(
  items: Array<{
    port: number;
    name?: string;
    note?: string;
    protocol?: string;
  }>,
): Promise<void> {
  const { getUserPreference, setUserPreference } = await import(
    '@/lib/preferences'
  );
  const list = await getUserPreference<ManualOccupiedPort[]>(
    'manualOccupiedPorts',
    [],
  );
  const newPortsSet = new Set(items.map((i) => i.port));
  const filtered = Array.isArray(list)
    ? list.filter((p) => p && !newPortsSet.has(p.port))
    : [];

  for (const item of items) {
    filtered.push({
      port: item.port,
      name: (item.name || '').trim() || '手动黑名单',
      note: item.note?.trim() || undefined,
      protocol: item.protocol?.trim() || 'tcp',
    });
  }

  await setUserPreference('manualOccupiedPorts', filtered);
}

/**
 * 新增或更新单个手动标记端口
 */
export async function addManualOccupiedPort(
  item: ManualOccupiedPort,
): Promise<void> {
  await addManualOccupiedPorts([item]);
}

/**
 * 移除手动标记端口
 */
export async function removeManualOccupiedPort(port: number): Promise<void> {
  const { getUserPreference, setUserPreference } = await import(
    '@/lib/preferences'
  );
  const list = await getUserPreference<ManualOccupiedPort[]>(
    'manualOccupiedPorts',
    [],
  );
  if (!Array.isArray(list)) return;
  const filtered = list.filter((p) => p && p.port !== port);
  await setUserPreference('manualOccupiedPorts', filtered);
}

/**
 * 获取完整的端口占用信息并推荐下一个空闲端口
 * @param startPort 推荐起始端口（默认 8000）
 */
export async function getPortStatus(
  startPort = 8000,
): Promise<PortStatusResult> {
  const [dockerAvailable, dockerPorts, manualPorts, cardPorts] =
    await Promise.all([
      isDockerAvailable(),
      getDockerOccupiedPorts(),
      getManualOccupiedPorts(),
      getCardOccupiedPorts(),
    ]);

  // 合并并按端口排序
  const portMap = new Map<number, OccupiedPort>();

  // 优先级：Docker 容器 > 手动标记 > 卡片
  for (const dp of dockerPorts) {
    portMap.set(dp.port, dp);
  }

  for (const mp of manualPorts) {
    if (!portMap.has(mp.port)) {
      portMap.set(mp.port, mp);
    }
  }

  for (const cp of cardPorts) {
    if (!portMap.has(cp.port)) {
      portMap.set(cp.port, cp);
    }
  }

  const occupiedPorts = Array.from(portMap.values()).sort(
    (a, b) => a.port - b.port,
  );
  const occupiedSet = new Set(occupiedPorts.map((p) => p.port));

  // 推荐端口查找算法：从 startPort 开始寻找既没有在占用集合中，又未被本地绑定的端口
  let candidate = Math.max(1024, startPort);
  let recommendedPort = candidate;

  while (candidate <= 65535) {
    if (!occupiedSet.has(candidate)) {
      const isAvailable = await isLocalPortAvailable(candidate);
      if (isAvailable) {
        recommendedPort = candidate;
        break;
      }
    }
    candidate++;
  }

  return {
    dockerAvailable,
    recommendedPort,
    occupiedPorts,
  };
}

/**
 * 汇总各渠道内网候选 IP（Lucky 后台配置、卡片内部地址、宿主机网卡）
 * 供反向代理部署或容器环境下一键选择
 */
export async function getSuggestedHostIps(): Promise<HostIpSuggestion[]> {
  const suggestions: HostIpSuggestion[] = [];
  const seenIps = new Set<string>();

  const addSuggestion = (
    ip: string,
    source: 'lucky' | 'card' | 'network',
    label: string,
  ) => {
    const trimmed = ip.trim();
    if (!isValidIpv4(trimmed)) return;
    if (trimmed === '127.0.0.1' || trimmed === '0.0.0.0') return;
    if (seenIps.has(trimmed)) return;
    seenIps.add(trimmed);
    suggestions.push({ ip: trimmed, source, label });
  };

  // 1. Lucky 后台配置的 IP
  try {
    const { getUserPreference } = await import('@/lib/preferences');
    const { DEFAULT_LUCKY_CONFIG } = await import('@/lib/lucky');
    const lucky = await getUserPreference<LuckyConfig>(
      'lucky',
      DEFAULT_LUCKY_CONFIG,
    );
    if (lucky?.baseUrl) {
      const fullUrl = lucky.baseUrl.includes('://')
        ? lucky.baseUrl
        : `http://${lucky.baseUrl}`;
      const parsed = new URL(fullUrl);
      if (isValidIpv4(parsed.hostname)) {
        addSuggestion(parsed.hostname, 'lucky', 'Lucky 后台');
      }
    }
  } catch {
    // 忽略异常
  }

  // 2. 卡片内网地址统计 (按出现频次降序)
  try {
    const { prisma } = await import('@/lib/db');
    const cards = await prisma.card.findMany({
      select: { internalUrl: true },
    });
    const ipCounts = new Map<string, number>();
    for (const c of cards) {
      if (!c.internalUrl) continue;
      try {
        const full = c.internalUrl.includes('://')
          ? c.internalUrl
          : `http://${c.internalUrl}`;
        const u = new URL(full);
        if (
          isValidIpv4(u.hostname) &&
          u.hostname !== '127.0.0.1' &&
          u.hostname !== '0.0.0.0'
        ) {
          ipCounts.set(u.hostname, (ipCounts.get(u.hostname) ?? 0) + 1);
        }
      } catch {
        // 忽略异常
      }
    }

    const sortedCardIps = Array.from(ipCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    );
    for (const [ip, count] of sortedCardIps) {
      addSuggestion(ip, 'card', `卡片内网 (${count})`);
    }
  } catch {
    // 忽略异常
  }

  // 3. 本机物理与局域网网卡
  try {
    const interfaces = os.networkInterfaces();
    for (const [name, ifaceList] of Object.entries(interfaces)) {
      if (!ifaceList) continue;
      if (/^(docker|veth|br-|cni|flannel)/i.test(name)) continue;
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addSuggestion(iface.address, 'network', '本机网卡');
        }
      }
    }
  } catch {
    // 忽略异常
  }

  // 4. 若上面都没收集到，兜底 getServerIp()
  const serverIp = getServerIp();
  if (serverIp && serverIp !== '127.0.0.1') {
    addSuggestion(serverIp, 'network', '本机网卡');
  }

  // 局域网私有 IP (192.168 / 10 / 172.16-31) 排序在前
  return suggestions.sort((a, b) => {
    const aLan = isLanIpv4(a.ip);
    const bLan = isLanIpv4(b.ip);
    if (aLan && !bLan) return -1;
    if (!aLan && bLan) return 1;
    return 0;
  });
}
