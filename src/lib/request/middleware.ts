'use client';

import { useToast } from '@astryxdesign/core/Toast';
import { useEffect } from 'react';
import type { Middleware } from 'swr';
import { ApiError } from './ApiError';

/** 401 跳转登录页的防重复 flag（session 失效时多个请求会同时失败） */
let isRedirecting = false;

/**
 * SWR 错误处理中间件
 *
 * - 401：整页跳转 /login（清客户端内存状态）
 * - 5xx / 网络错误：toast 提示
 * - 4xx（除 401）：不处理，由业务层自己处理（表单字段错误等）
 *
 * middleware 本身是 hook，可在内部直接调 useToast()
 */
export const errorMiddleware: Middleware =
  (useSWRNext) => (key, fetcher, config) => {
    const swr = useSWRNext(key, fetcher, config);
    const showToast = useToast();

    useEffect(() => {
      const err = swr.error;
      if (!(err instanceof ApiError)) return;

      // 请求被取消（页面刷新/卸载）：不处理
      if (err.isAborted) return;

      if (err.isUnauthorized && !isRedirecting) {
        isRedirecting = true;
        window.location.href = '/login';
        // 3 秒后自动复位（防止跳转失败时永久卡住后续 401 处理）
        const timer = setTimeout(() => {
          isRedirecting = false;
        }, 3000);
        return () => clearTimeout(timer);
      } else if (err.status >= 500 || err.isNetworkError) {
        showToast({ body: err.message, type: 'error' });
      }
    }, [swr.error, showToast]);

    return swr;
  };
