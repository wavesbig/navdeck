import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/ports', () => ({
  getPortStatus: vi.fn(),
  getServerIp: vi.fn(),
  getSuggestedHostIps: vi.fn(),
  isLocalPortAvailable: vi.fn(),
  isValidIpv4: vi.fn(),
  addManualOccupiedPorts: vi.fn(),
  removeManualOccupiedPort: vi.fn(),
  parsePortRangeInput: vi.fn((input: string) => {
    return input
      .split(/[,，\s]+/)
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
  }),
}));

vi.mock('@/lib/preferences', () => ({
  getUserPreference: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  addManualOccupiedPorts,
  getPortStatus,
  getServerIp,
  getSuggestedHostIps,
  isLocalPortAvailable,
  isValidIpv4,
  removeManualOccupiedPort,
} from '@/lib/ports';
import { getUserPreference } from '@/lib/preferences';
import { DELETE, GET, POST } from './route';

const mockAuth = vi.mocked(auth);
const mockGetPortStatus = vi.mocked(getPortStatus);
const mockGetServerIp = vi.mocked(getServerIp);
const mockGetSuggestedHostIps = vi.mocked(getSuggestedHostIps);
const mockIsLocalPortAvailable = vi.mocked(isLocalPortAvailable);
const mockIsValidIpv4 = vi.mocked(isValidIpv4);
const mockAddManualOccupiedPorts = vi.mocked(addManualOccupiedPorts);
const mockRemoveManualOccupiedPort = vi.mocked(removeManualOccupiedPort);
const mockGetUserPreference = vi.mocked(getUserPreference);

const mockSession = { user: { id: 'admin' } };

describe('Ports API (/api/ports)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
    mockGetUserPreference.mockResolvedValue('');
    mockGetServerIp.mockReturnValue('192.168.1.10');
    mockGetSuggestedHostIps.mockResolvedValue([
      { ip: '192.168.1.10', source: 'network', label: '本机网卡' },
    ]);
    mockIsValidIpv4.mockReturnValue(true);
    mockGetPortStatus.mockResolvedValue({
      dockerAvailable: true,
      recommendedPort: 8002,
      occupiedPorts: [
        { port: 8000, type: 'card', name: 'NavDeck' },
        { port: 8001, type: 'manual', name: '我的应用', note: '宿主机' },
      ],
    });
  });

  describe('GET /api/ports', () => {
    it('未登录时返回 401', async () => {
      mockAuth.mockResolvedValue(null as never);
      const req = new Request('http://localhost/api/ports');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('返回端口占用和推荐信息', async () => {
      const req = new Request('http://localhost/api/ports?startPort=8000');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.recommendedPort).toBe(8002);
      expect(body.occupiedPorts).toHaveLength(2);
      expect(body.hostIp).toBe('192.168.1.10');
    });

    it('检测指定端口 checkPort 为手动标记时返回正确 occupiedBy', async () => {
      const req = new Request('http://localhost/api/ports?checkPort=8001');
      const res = await GET(req);
      const body = await res.json();
      expect(body.checkResult).toEqual({
        port: 8001,
        isAvailable: false,
        occupiedBy: '手动标记: 我的应用',
      });
    });

    it('检测指定端口 checkPort 空闲时返回 isAvailable: true', async () => {
      mockIsLocalPortAvailable.mockResolvedValue(true);
      const req = new Request('http://localhost/api/ports?checkPort=8080');
      const res = await GET(req);
      const body = await res.json();
      expect(body.checkResult).toEqual({
        port: 8080,
        isAvailable: true,
        occupiedBy: undefined,
      });
    });

    it('检测指定端口已被系统占用且非卡片/手动标记时返回 本地系统进程', async () => {
      mockIsLocalPortAvailable.mockResolvedValue(false);
      const req = new Request('http://localhost/api/ports?checkPort=8080');
      const res = await GET(req);
      const body = await res.json();
      expect(body.checkResult).toEqual({
        port: 8080,
        isAvailable: false,
        occupiedBy: '本地系统进程',
      });
    });
  });

  describe('POST /api/ports (手动标记与黑名单)', () => {
    it('参数合法时成功添加手动标记端口', async () => {
      const req = new Request('http://localhost/api/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: 8001,
          name: '自定义服务',
          note: '测试备注',
          protocol: 'tcp',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        success: true,
        count: 1,
        ports: [8001],
      });
      expect(mockAddManualOccupiedPorts).toHaveBeenCalledWith([
        {
          port: 8001,
          name: '自定义服务',
          note: '测试备注',
          protocol: 'tcp',
        },
      ]);
    });

    it('未填写服务名称时默认使用 手动黑名单', async () => {
      const req = new Request('http://localhost/api/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: 8001,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockAddManualOccupiedPorts).toHaveBeenCalledWith([
        {
          port: 8001,
          name: '手动黑名单',
          note: undefined,
          protocol: 'tcp',
        },
      ]);
    });

    it('支持使用 portInput 快速批量加入黑名单', async () => {
      const req = new Request('http://localhost/api/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portInput: '8001, 8002',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockAddManualOccupiedPorts).toHaveBeenCalledWith([
        {
          port: 8001,
          name: '手动黑名单',
          note: undefined,
          protocol: 'tcp',
        },
        {
          port: 8002,
          name: '手动黑名单',
          note: undefined,
          protocol: 'tcp',
        },
      ]);
    });

    it('端口非法时返回 400', async () => {
      const req = new Request('http://localhost/api/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: 70000,
          name: '超出范围',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(mockAddManualOccupiedPorts).not.toHaveBeenCalled();
    });

    it('未提供任何端口信息时返回 400', async () => {
      const req = new Request('http://localhost/api/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '测试',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/ports (取消手动标记)', () => {
    it('支持通过 searchParams 删除指定端口', async () => {
      const req = new Request('http://localhost/api/ports?port=8001', {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, count: 1 });
      expect(mockRemoveManualOccupiedPort).toHaveBeenCalledWith(8001);
    });

    it('支持通过 json body 删除指定端口', async () => {
      const req = new Request('http://localhost/api/ports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: 8001 }),
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, count: 1 });
      expect(mockRemoveManualOccupiedPort).toHaveBeenCalledWith(8001);
    });

    it('端口非法时返回 400', async () => {
      const req = new Request('http://localhost/api/ports?port=abc', {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(400);
      expect(mockRemoveManualOccupiedPort).not.toHaveBeenCalled();
    });
  });
});
