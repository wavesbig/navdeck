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
});

describe('getServerIp', () => {
  it('返回合法的 IPv4 字符串', async () => {
    const { getServerIp } = await import('./ports');
    const ip = getServerIp();
    expect(typeof ip).toBe('string');
    expect(ip.split('.').length).toBe(4);
  });
});
