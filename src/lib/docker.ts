import Docker from 'dockerode';
import type { DockerResourceSummary, DockerStatusSummary } from '@/types';

/**
 * Docker 客户端单例
 *
 * - 默认连接 unix socket /var/run/docker.sock
 * - 通过 DOCKER_HOST 环境变量可切换（tcp://host:port）
 * - 连接失败时降级为不可用（API 返回空数据 + 可用=false）
 */

let dockerInstance: Docker | null = null;

function getDocker(): Docker | null {
  if (dockerInstance) return dockerInstance;

  try {
    const host = process.env.DOCKER_HOST;
    if (host) {
      // 支持 tcp://host:port 格式
      const url = new URL(host);
      dockerInstance = new Docker({
        host: url.hostname,
        port: Number(url.port || 2375),
        protocol: url.protocol === 'https:' ? 'https' : 'http',
      });
    } else {
      // 默认 unix socket
      dockerInstance = new Docker();
    }
  } catch (e) {
    console.error('Docker 初始化失败', e);
    return null;
  }
  return dockerInstance;
}

/** 检查 Docker 是否可用 */
export async function isDockerAvailable(): Promise<boolean> {
  const docker = getDocker();
  if (!docker) return false;
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

/** 获取容器状态聚合（运行中 / 总数 / 停止） */
export async function getDockerStatus(): Promise<DockerStatusSummary> {
  const docker = getDocker();
  if (!docker) {
    return { running: 0, total: 0, stopped: 0 };
  }
  try {
    const containers = await docker.listContainers({ all: true });
    const total = containers.length;
    const running = containers.filter((c) => c.State === 'running').length;
    return {
      running,
      total,
      stopped: total - running,
    };
  } catch (e) {
    console.error('获取容器列表失败', e);
    return { running: 0, total: 0, stopped: 0 };
  }
}

/**
 * 获取资源水位（聚合 CPU / 内存 / 磁盘 IO）
 *
 * CPU 计算：当前容器 CPU 使用率与上一秒采样的差值
 * 内存：所有容器 mem_usage / mem_limit 之和的聚合百分比
 * 磁盘 IO：所有容器 IO 读/写字节速率
 */
export async function getDockerResourceStats(): Promise<DockerResourceSummary> {
  const docker = getDocker();
  if (!docker) {
    return {
      cpuPercent: 0,
      memoryPercent: 0,
      diskReadBytesPerSec: 0,
      diskWriteBytesPerSec: 0,
    };
  }

  try {
    const containers = await docker.listContainers({ all: false });
    if (containers.length === 0) {
      return {
        cpuPercent: 0,
        memoryPercent: 0,
        diskReadBytesPerSec: 0,
        diskWriteBytesPerSec: 0,
      };
    }

    // 第一次采样
    const samples1 = await collectSamples(docker, containers);
    // 等待 1 秒
    await new Promise((r) => setTimeout(r, 1000));
    // 第二次采样
    const samples2 = await collectSamples(docker, containers);

    // 按容器 id 对齐两次采样（采样失败的容器已被过滤，索引可能错位）
    const samples2ById = new Map(samples2.map((s) => [s.id, s]));

    // 聚合 CPU / 内存
    let totalCpuRatio = 0;
    let totalMemUsage = 0;
    let totalMemLimit = 0;
    let totalDiskRead = 0;
    let totalDiskWrite = 0;

    for (const s1 of samples1) {
      const s2 = samples2ById.get(s1.id);
      if (!s2) continue;

      // CPU：system_cpu_usage 是宿主机全局值，所有容器共享同一分母，
      // 整机水位 = 各容器 cpuDelta/systemDelta 之和
      const cpuDelta = s2.cpuUsage - s1.cpuUsage;
      const systemDelta = s2.systemUsage - s1.systemUsage;
      if (systemDelta > 0 && cpuDelta > 0) {
        totalCpuRatio += cpuDelta / systemDelta;
      }

      // 内存（取第二次采样值）
      totalMemUsage += s2.memUsage;
      totalMemLimit += s2.memLimit;

      // 磁盘 IO delta（bytes/sec）
      totalDiskRead += Math.max(0, s2.diskRead - s1.diskRead);
      totalDiskWrite += Math.max(0, s2.diskWrite - s1.diskWrite);
    }

    const cpuPercent = totalCpuRatio * 100;

    const memoryPercent =
      totalMemLimit > 0 ? (totalMemUsage / totalMemLimit) * 100 : 0;

    return {
      cpuPercent: Math.min(100, Math.round(cpuPercent * 10) / 10),
      memoryPercent: Math.min(100, Math.round(memoryPercent * 10) / 10),
      diskReadBytesPerSec: Math.round(totalDiskRead),
      diskWriteBytesPerSec: Math.round(totalDiskWrite),
    };
  } catch (e) {
    console.error('获取资源水位失败', e);
    return {
      cpuPercent: 0,
      memoryPercent: 0,
      diskReadBytesPerSec: 0,
      diskWriteBytesPerSec: 0,
    };
  }
}

/** 采样单容器资源 */
type Sample = {
  id: string;
  cpuUsage: number;
  systemUsage: number;
  memUsage: number;
  memLimit: number;
  diskRead: number;
  diskWrite: number;
};

async function collectSamples(
  docker: Docker,
  containers: Docker.ContainerInfo[],
): Promise<Sample[]> {
  const samples = await Promise.all(
    containers.map(async (c) => {
      try {
        const stats = await docker.getContainer(c.Id).stats({ stream: false });
        const cpu = stats.cpu_stats;
        const precpu = stats.precpu_stats;
        const mem = stats.memory_stats;

        // CPU
        const cpuUsage =
          (cpu.cpu_usage?.total_usage ?? 0) -
          (precpu.cpu_usage?.total_usage ?? 0);
        const systemUsage =
          (cpu.system_cpu_usage ?? 0) - (precpu.system_cpu_usage ?? 0);
        // 内存
        const memUsage = mem.usage ?? 0;
        const memLimit = mem.limit ?? 0;

        // 磁盘 IO（累计字节数）
        let diskRead = 0;
        let diskWrite = 0;
        if (stats.blkio_stats?.io_service_bytes_recursive) {
          for (const io of stats.blkio_stats.io_service_bytes_recursive) {
            if (io.op?.toLowerCase() === 'read') diskRead += io.value ?? 0;
            if (io.op?.toLowerCase() === 'write') diskWrite += io.value ?? 0;
          }
        }

        return {
          id: c.Id,
          cpuUsage,
          systemUsage,
          memUsage,
          memLimit,
          diskRead,
          diskWrite,
        };
      } catch {
        return null;
      }
    }),
  );
  return samples.filter((s): s is Sample => s !== null);
}
