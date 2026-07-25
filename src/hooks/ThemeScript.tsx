import {THEME_SCRIPT_CODE} from './useTheme';

/**
 * 在 <head> 注入 hydration 前执行的 inline script
 *
 * 作用：在 React hydration 之前，从 localStorage 读取主题偏好并设置 <html data-theme>
 *      避免 SSR 时 data-theme="light" 与实际偏好不一致造成的明暗闪烁
 *
 * 放在 root layout 的 <head> 中。Server component 安全（无 'use client'）。
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{__html: THEME_SCRIPT_CODE}} />;
}
