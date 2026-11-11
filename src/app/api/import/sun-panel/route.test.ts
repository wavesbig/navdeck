import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/sun-panel', () => ({
  parseSunPanelData: vi.fn(),
  parseSunPanelFile: vi.fn(),
  applySunPanelImport: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  applySunPanelImport,
  parseSunPanelData,
  parseSunPanelFile,
} from '@/lib/sun-panel';
import { POST } from './route';

const mockAuth = vi.mocked(auth);
const mockParseSunPanelData = vi.mocked(parseSunPanelData);
const mockParseSunPanelFile = vi.mocked(parseSunPanelFile);
const mockApplySunPanelImport = vi.mocked(applySunPanelImport);
const mockRouteContext = {} as never;

describe('Sun-Panel Import API (POST /api/import/sun-panel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'test-user' } } as never);
  });

  it('未登录请求应返回 401', async () => {
    mockAuth.mockResolvedValue(null as never);
    const req = new Request('http://localhost/api/import/sun-panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req, mockRouteContext);
    expect(res.status).toBe(401);
  });

  it('JSON 格式预览请求应成功返回解析结果', async () => {
    const mockPreview = {
      categories: [
        {
          name: '媒体服务',
          order: 0,
          cards: [
            {
              name: 'Plex',
              internalUrl: 'http://192.168.1.100:32400',
              externalUrl: 'http://192.168.1.100:32400',
              icon: '',
              description: null,
              openInDialog: false,
              order: 0,
            },
          ],
        },
      ],
      totalCategories: 1,
      totalCards: 1,
      skippedCards: 0,
    };
    mockParseSunPanelData.mockReturnValue(mockPreview);
    mockParseSunPanelFile.mockResolvedValue(mockPreview);

    const req = new Request('http://localhost/api/import/sun-panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'preview',
        data: { icons: [] },
      }),
    });

    const res = await POST(req, mockRouteContext);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.preview).toEqual(mockPreview);
    expect(mockApplySunPanelImport).not.toHaveBeenCalled();
  });

  it('multipart/form-data 导入应能解析文件并执行导入', async () => {
    const mockPreview = {
      categories: [
        {
          name: '分组',
          order: 0,
          cards: [
            {
              name: '卡片',
              internalUrl: 'http://example.com',
              externalUrl: 'http://example.com',
              icon: '',
              description: null,
              openInDialog: false,
              order: 0,
            },
          ],
        },
      ],
      totalCategories: 1,
      totalCards: 1,
      skippedCards: 0,
    };
    mockParseSunPanelData.mockReturnValue(mockPreview);
    mockParseSunPanelFile.mockResolvedValue(mockPreview);
    mockApplySunPanelImport.mockResolvedValue({
      categoriesCreated: 1,
      categoriesReused: 0,
      cardsCreated: 1,
      skippedCards: 0,
    });

    const formData = new FormData();
    const file = new File(['{"icons":[]}'], 'sun-panel.json', {
      type: 'application/json',
    });
    formData.append('file', file);
    formData.append('mode', 'append');

    const req = new Request('http://localhost/api/import/sun-panel', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, mockRouteContext);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.stats.cardsCreated).toBe(1);
    expect(mockApplySunPanelImport).toHaveBeenCalledWith(mockPreview, 'append');
  });

  it('如果解析结果中卡片总数为 0，应返回 400', async () => {
    mockParseSunPanelData.mockReturnValue({
      categories: [],
      totalCategories: 0,
      totalCards: 0,
      skippedCards: 2,
    });

    const req = new Request('http://localhost/api/import/sun-panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { icons: [] },
      }),
    });

    const res = await POST(req, mockRouteContext);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('未发现任何有效卡片');
  });
});
