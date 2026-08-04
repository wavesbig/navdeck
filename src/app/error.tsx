'use client';

import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { useEffect } from 'react';

/**
 * 全局错误边界
 *
 * 捕获任何未处理的服务端组件错误，避免用户看到 Next.js 默认红色错误页。
 * - 生产环境隐藏具体错误信息，仅提示"出错了"
 * - 开发环境显示 error.message 便于调试
 * - 提供"重试"按钮调用 reset() 重置错误边界
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 错误上报钩子（如接入 Sentry 等可在此处扩展）
    console.error('页面渲染错误', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Heading level={1} className="text-xl font-semibold">
        出错了
      </Heading>
      <Text className="text-secondary">页面加载时发生错误，请稍后重试。</Text>
      {isDev && error.message && (
        <pre className="max-w-[640px] overflow-auto rounded-md bg-danger/10 p-3 text-left text-sm text-danger">
          {error.message}
        </pre>
      )}
      <Button label="重试" variant="primary" onClick={() => reset()} />
    </main>
  );
}
