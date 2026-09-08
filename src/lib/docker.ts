import Docker from 'dockerode';
import type {
  DockerEngineInfo,
  DockerResourceSummary,
  DockerStatusSummary,
} from '@/types';

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

/** 获取容器状态聚合（运行中 / 总数 / 停止 / 运行容器名） */
export async function getDockerStatus(): Promise<DockerStatusSummary> {
  const docker = getDocker();
  if (!docker) {
    return { running: 0, total: 0, stopped: 0, runningNames: [] };
  }
  try {
    const containers = await docker.listContainers({ all: true });
    const total = containers.length;
    const runningList = containers.filter((c) => c.State === 'running');
    return {
      running: runningList.length,
      total,
      stopped: total - runningList.length,
      runningNames: runningList.map((c) =>
        (c.Names[0] ?? '').replace(/^\//, ''),
      ),
    };
  } catch (e) {
    console.error('获取容器列表失败', e);
    return { running: 0, total: 0, stopped: 0, runningNames: [] };
  }
}

/** 获取 Docker 引擎信息（镜像数 / 版本 / 宿主机 CPU / 内存） */
export async function getDockerEngineInfo(): Promise<DockerEngineInfo> {
  const fallback: DockerEngineInfo = {
    images: 0,
    serverVersion: '',
    cpus: 0,
    memTotalBytes: 0,
  };
  const docker = getDocker();
  if (!docker) return fallback;
  try {
    const info = await docker.info();
    return {
      images: info.Images ?? 0,
      serverVersion: info.ServerVersion ?? '',
      cpus: info.NCPU ?? 0,
      memTotalBytes: info.MemTotal ?? 0,
    };
  } catch (e) {
    console.error('获取引擎信息失败', e);
    return fallback;
  }
}

/**
 * 获取资源水位（聚合 CPU / 内存 / 磁盘 IO）
 *
 * CPU 计算：one-shot stats 返回累计计数，跨请求用上次快照差值折算。
 * 内存：所有容器 mem_usage / mem_limit 之和的聚合百分比
 * 磁盘 IO：Docker 只返回累计字节数，同样按上次快照差值折算速率。
 */
const lastResourceSamples = new Map<
  string,
  {
    cpuUsage: number;
    systemUsage: number;
    read: number;
    write: number;
    at: number;
  }
>();

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

    const samples1 = await collectSamples(docker, containers);

    // 聚合 CPU / 内存
    let totalCpuRatio = 0;
    let totalMemUsage = 0;
    let totalMemLimit = 0;
    let totalDiskRead = 0;
    let totalDiskWrite = 0;

    for (const sample of samples1) {
      // 内存
      totalMemUsage += sample.memUsage;
      totalMemLimit += sample.memLimit;

      // 对齐上次累计计数；同一时间戳不折算，避免除以 0
      const previous = lastResourceSamples.get(sample.id);
      const elapsedSeconds =
        previous && sample.sampledAt > previous.at
          ? (sample.sampledAt - previous.at) / 1000
          : 0;
      if (previous && elapsedSeconds > 0) {
        // CPU：system_cpu_usage 是宿主机全局值，所有容器共享同一分母，
        // 整机水位 = 各容器 cpuDelta/systemDelta 之和
        const cpuDelta = sample.cpuUsage - previous.cpuUsage;
        const systemDelta = sample.systemUsage - previous.systemUsage;
        if (systemDelta > 0 && cpuDelta > 0) {
          totalCpuRatio += cpuDelta / systemDelta;
        }

        totalDiskRead +=
          Math.max(0, sample.diskRead - previous.read) / elapsedSeconds;
        totalDiskWrite +=
          Math.max(0, sample.diskWrite - previous.write) / elapsedSeconds;
      }
      lastResourceSamples.set(sample.id, {
        cpuUsage: sample.cpuUsage,
        systemUsage: sample.systemUsage,
        read: sample.diskRead,
        write: sample.diskWrite,
        at: sample.sampledAt,
      });
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
  sampledAt: number;
};

async function collectSamples(
  docker: Docker,
  containers: Docker.ContainerInfo[],
): Promise<Sample[]> {
  const samples = await Promise.all(
    containers.map(async (c) => {
      try {
        // one-shot 跳过 Docker stats 的内部第二次采样等待
        const stats = await docker
          .getContainer(c.Id)
          .stats({ stream: false, 'one-shot': true });
        const cpu = stats.cpu_stats;
        const mem = stats.memory_stats;

        // CPU
        const cpuUsage = cpu.cpu_usage?.total_usage ?? 0;
        const systemUsage = cpu.system_cpu_usage ?? 0;
        // 内存
        const memUsage = mem.usage ?? 0;
        const memLimit = mem.limit ?? 0;
        const sampledAt = Date.parse(stats.read) || Date.now();

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
          sampledAt,
        };
      } catch {
        return null;
      }
    }),
  );
  return samples.filter((s): s is Sample => s !== null);
}
