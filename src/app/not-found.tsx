import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import Link from 'next/link';

/**
 * 自定义 404 页面
 *
 * 已登录用户访问不存在的路径时显示（未登录用户被 proxy.ts 重定向到 /login）。
 * FloatingLogo 已在 layout.tsx 全局渲染，提供左上角返回主页入口。
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Heading
        level={1}
        className="text-6xl font-bold tracking-tight text-foreground/40"
      >
        404
      </Heading>
      <Heading level={2} className="text-xl font-semibold">
        找不到该页面
      </Heading>
      <Text className="text-secondary">你访问的页面不存在或已被移动。</Text>
      <Link href="/">
        <Button label="返回主页" variant="primary" />
      </Link>
    </main>
  );
}
