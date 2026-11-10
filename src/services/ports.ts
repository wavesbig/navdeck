import { request } from '@/lib/request/request';
import type { PortStatusResult } from '@/types';

export const portsApi = {
  /** 获取端口占用与推荐信息 */
  getStatus: (options?: { startPort?: number; checkPort?: number }) => {
    const params = new URLSearchParams();
    if (options?.startPort) {
      params.set('startPort', String(options.startPort));
    }
    if (options?.checkPort) {
      params.set('checkPort', String(options.checkPort));
    }
    const query = params.toString();
    return request<PortStatusResult>(`/api/ports${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },

  /** 手动标记端口为已占用（支持单个端口、数组或黑名单区间如 8001,8002） */
  addManualPort: (data: {
    port?: number;
    ports?: number[];
    portInput?: string;
    name?: string;
    note?: string;
    protocol?: string;
  }) => {
    return request<{ success: boolean; count?: number; ports?: number[] }>(
      '/api/ports',
      {
        method: 'POST',
        body: data,
      },
    );
  },

  /** 取消手动标记占用的端口 */
  deleteManualPort: (port: number) => {
    return request<{ success: boolean }>(`/api/ports?port=${port}`, {
      method: 'DELETE',
    });
  },
};
