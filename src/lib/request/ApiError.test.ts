import { describe, expect, it } from 'vitest';
import { ApiError } from './ApiError';

describe('ApiError', () => {
  it('保留 message / status / data', () => {
    const err = new ApiError('boom', 500, { extra: 1 });
    expect(err.message).toBe('boom');
    expect(err.status).toBe(500);
    expect(err.data).toEqual({ extra: 1 });
    expect(err.name).toBe('ApiError');
  });

  it('isUnauthorized 在 401 时为 true', () => {
    expect(new ApiError('未登录', 401).isUnauthorized).toBe(true);
    expect(new ApiError('服务器错误', 500).isUnauthorized).toBe(false);
    expect(new ApiError('网络错误', 0).isUnauthorized).toBe(false);
  });

  it('isNetworkError 在 status=0 时为 true', () => {
    expect(new ApiError('网络错误', 0).isNetworkError).toBe(true);
    expect(new ApiError('失败', 500).isNetworkError).toBe(false);
  });

  it('fieldErrors 从 data.fieldErrors 提取', () => {
    const err = new ApiError('校验失败', 400, {
      fieldErrors: { name: ['必填'], url: ['格式错误'] },
    });
    expect(err.fieldErrors).toEqual({
      name: ['必填'],
      url: ['格式错误'],
    });
  });

  it('data 缺少 fieldErrors 时返回 undefined', () => {
    expect(
      new ApiError('失败', 500, { error: 'boom' }).fieldErrors,
    ).toBeUndefined();
    expect(new ApiError('失败', 500).fieldErrors).toBeUndefined();
  });

  it('fieldErrors 为空对象时返回空对象', () => {
    const err = new ApiError('校验失败', 400, { fieldErrors: {} });
    expect(err.fieldErrors).toEqual({});
  });

  it('是 Error 的实例', () => {
    const err = new ApiError('msg', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });
});
