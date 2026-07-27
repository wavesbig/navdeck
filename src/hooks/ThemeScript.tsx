import { THEME_SCRIPT_CODE } from './useTheme';

/**
 * 在 <head> 注入 hydration 前执行的 inline script
 *
 * 作用：在 React hydration 之前，从 localStorage 读取主题偏好并设置 <html data-theme>
 *      避免 SSR 时 data-theme="light" 与实际偏好不一致造成的明暗闪烁
 *
 * SSR 安全（Next.js 16 推荐模式）：
 * - 服务端渲染 type="text/javascript"（浏览器解析 HTML 时同步执行）
 * - 客户端 hydration 时 type="text/plain"（不再执行，避免 React 警告）
 * - suppressHydrationWarning 让 React 接受 type 属性的服务端/客户端差异
 *
 * 参考：node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT_CODE }}
    />
  );
}
