import net from 'node:net';
import os from 'node:os';
import { getDocker, isDockerAvailable } from '@/lib/docker';

export interface OccupiedPort {
  port: number;
  type: 'docker' | 'card';
  name: string;
  status?: string;
  protocol?: string;
  url?: string;
}

export interface PortStatusResult {
  dockerAvailable: boolean;
  recommendedPort: number;
  occupiedPorts: OccupiedPort[];
  hostIp?: string;
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

/**
 * 快速检查本地 TCP 端口是否被系统进程占用
 */
export function isLocalPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, '0.0.0.0');
  });
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
 * 获取完整的端口占用信息并推荐下一个空闲端口
 * @param startPort 推荐起始端口（默认 8000）
 */
export async function getPortStatus(
  startPort = 8000,
): Promise<PortStatusResult> {
  const [dockerAvailable, dockerPorts, cardPorts] = await Promise.all([
    isDockerAvailable(),
    getDockerOccupiedPorts(),
    getCardOccupiedPorts(),
  ]);

  // 合并并按端口排序
  const portMap = new Map<number, OccupiedPort>();

  // 优先存 Docker 容器信息，其次是卡片
  for (const dp of dockerPorts) {
    portMap.set(dp.port, dp);
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
