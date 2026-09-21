import { request } from '@/lib/request/request';
import type { VersionCheckResult } from '@/types';

/** 版本更新检测 API service */
export const versionApi = {
  /** 检查更新（服务端 24h 节流；force 跳过节流，用于手动检查） */
  check: (force = false) =>
    request<VersionCheckResult>(`/api/version/check${force ? '?force=1' : ''}`),
};
