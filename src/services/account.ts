import { request } from '@/lib/request/request';

/** 账号信息（GET /api/account 响应体） */
export interface AccountInfo {
  id: string;
  username: string;
}

/** 账号更新 payload */
export interface AccountUpdatePayload {
  username?: string;
  currentPassword?: string;
  newPassword?: string;
}

/**
 * 账号 API service
 *
 * 账号信息读取由 AccountForm 通过 get() 直接调用（非 SWR，单次拉取）
 */
export const accountApi = {
  /** 读取当前账号 */
  get: () => request<AccountInfo>('/api/account'),

  /** 更新账号（用户名和/或密码） */
  update: (body: AccountUpdatePayload) =>
    request<void>('/api/account', { method: 'PATCH', body }),
};
