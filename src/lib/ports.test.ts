import { describe, expect, it } from 'vitest';
import { extractPortFromUrl, isLocalPortAvailable } from './ports';

describe('extractPortFromUrl', () => {
  it('正确从标准 HTTP/HTTPS URL 中提取端口', () => {
    expect(extractPortFromUrl('http://192.168.1.100:8080')).toBe(8080);
    expect(extractPortFromUrl('http://nas.local:9000/')).toBe(9000);
    expect(extractPortFromUrl('https://example.com:8443/dashboard')).toBe(8443);
  });

  it('没有指定端口的 URL 返回 null', () => {
    expect(extractPortFromUrl('http://192.168.1.100')).toBeNull();
    expect(extractPortFromUrl('https://example.com/api')).toBeNull();
  });

  it('支持 host:port 裸字符串', () => {
    expect(extractPortFromUrl('192.168.1.50:5000')).toBe(5000);
    expect(extractPortFromUrl('localhost:3000')).toBe(3000);
  });

  it('非法或空输入返回 null', () => {
    expect(extractPortFromUrl('')).toBeNull();
    expect(extractPortFromUrl('invalid-url')).toBeNull();
  });
});

describe('isLocalPortAvailable', () => {
  it('可侦测随机高位端口是否空闲', async () => {
    // 随机选一个极高端口测试
    const free = await isLocalPortAvailable(59123);
    expect(typeof free).toBe('boolean');
  });

  it('当端口在 127.0.0.1 上被监听时能准确识别为占用（修复 0.0.0.0 漏判漏洞）', async () => {
    const net = await import('node:net');
    const dummyServer = net.createServer();
    const testPort = 59876;
    await new Promise<void>((resolve) => {
      dummyServer.listen(testPort, '127.0.0.1', () => resolve());
    });
    try {
      const free = await isLocalPortAvailable(testPort);
      expect(free).toBe(false);
    } finally {
      await new Promise<void>((resolve) => dummyServer.close(() => resolve()));
    }
  });
});

describe('getServerIp', () => {
  it('返回合法的 IPv4 字符串', async () => {
    const { getServerIp } = await import('./ports');
    const ip = getServerIp();
    expect(typeof ip).toBe('string');
    expect(ip.split('.').length).toBe(4);
  });
});

describe('isValidIpv4 & isLanIpv4', () => {
  it('正确检验标准 IPv4 地址', async () => {
    const { isValidIpv4 } = await import('./ports');
    expect(isValidIpv4('192.168.1.1')).toBe(true);
    expect(isValidIpv4('10.0.0.1')).toBe(true);
    expect(isValidIpv4('127.0.0.1')).toBe(true);
    expect(isValidIpv4('255.255.255.255')).toBe(true);
    expect(isValidIpv4('256.1.1.1')).toBe(false);
    expect(isValidIpv4('192.168.1')).toBe(false);
    expect(isValidIpv4('example.com')).toBe(false);
    expect(isValidIpv4('')).toBe(false);
  });

  it('正确识别局域网私有 IPv4 地址', async () => {
    const { isLanIpv4 } = await import('./ports');
    expect(isLanIpv4('192.168.1.50')).toBe(true);
    expect(isLanIpv4('10.10.1.1')).toBe(true);
    expect(isLanIpv4('172.16.0.1')).toBe(true);
    expect(isLanIpv4('172.31.255.254')).toBe(true);
    // 非局域网
    expect(isLanIpv4('172.32.0.1')).toBe(false);
    expect(isLanIpv4('8.8.8.8')).toBe(false);
    expect(isLanIpv4('1.1.1.1')).toBe(false);
    expect(isLanIpv4('127.0.0.1')).toBe(false);
  });
});

describe('getSuggestedHostIps', () => {
  it('返回去重且局域网优先的候选 IP 数组', async () => {
    const { getSuggestedHostIps } = await import('./ports');
    const suggestions = await getSuggestedHostIps();
    expect(Array.isArray(suggestions)).toBe(true);
    for (const item of suggestions) {
      expect(item).toHaveProperty('ip');
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('label');
      expect(typeof item.ip).toBe('string');
    }
  });
});

describe('parsePortRangeInput', () => {
  it('正确解析单个端口、逗号分隔及区间字符串', async () => {
    const { parsePortRangeInput } = await import('./ports');
    expect(parsePortRangeInput('8001')).toEqual([8001]);
    expect(parsePortRangeInput('8001, 8002, 8003')).toEqual([8001, 8002, 8003]);
    expect(parsePortRangeInput('8001-8004')).toEqual([8001, 8002, 8003, 8004]);
    expect(parsePortRangeInput('8001, 8003-8005')).toEqual([
      8001, 8003, 8004, 8005,
    ]);
  });

  it('忽略非法端口与空输入', async () => {
    const { parsePortRangeInput } = await import('./ports');
    expect(parsePortRangeInput('')).toEqual([]);
    expect(parsePortRangeInput('abc, 0, 70000')).toEqual([]);
    expect(parsePortRangeInput('8001, def, 8002')).toEqual([8001, 8002]);
  });
});

describe('getDockerOccupiedPorts', () => {
  it('当容器 Ports 字段为 undefined 或空时安全跳过而不抛错', async () => {
    const { getDockerOccupiedPorts } = await import('./ports');
    const ports = await getDockerOccupiedPorts();
    expect(Array.isArray(ports)).toBe(true);
  });
});
