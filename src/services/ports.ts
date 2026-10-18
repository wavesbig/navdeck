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
};
