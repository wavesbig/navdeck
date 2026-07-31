/**
 * 统一 API 错误类
 *
 * request 在 HTTP 非 2xx 或网络失败时抛出，业务层 catch 后可读 status / fieldErrors。
 */
export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP 状态码；网络错误（fetch 本身抛异常）为 0 */
    public readonly status: number,
    /** 服务端返回的响应体（含 { error, fieldErrors } 等） */
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** 是否 401 未登录 */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 是否网络错误（fetch 本身失败，无 HTTP 响应） */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** 是否请求被取消（页面刷新/卸载/SWR 取消） */
  get isAborted(): boolean {
    return this.status === -1;
  }

  /** 字段级错误（400 校验失败时服务端返回 { fieldErrors: Record<string, string[]> }） */
  get fieldErrors(): Record<string, string[]> | undefined {
    return (this.data as { fieldErrors?: Record<string, string[]> } | undefined)
      ?.fieldErrors;
  }
}
