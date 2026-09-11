import { Home } from 'lucide-react';
import Link from 'next/link';

interface SettingsHomeLinkProps {
  /** 页面有整体最大宽度框架时，相对框架绝对定位而非视口固定。 */
  withinFrame?: boolean;
}

/**
 * 品牌标识完全隐藏时的回首页兜底入口。
 *
 * 保持 FloatingLogo 的位置与轻盈感：默认只有图标，不占文案空间；
 * hover/focus 才出现柔和表面，避免设置内容被一个“返回按钮”打断。
 */
export function SettingsHomeLink({
  withinFrame = false,
}: SettingsHomeLinkProps) {
  return (
    <Link
      href="/"
      title="返回首页"
      aria-label="返回首页"
      className={`${withinFrame ? 'absolute' : 'fixed'} left-8 top-7 z-50 inline-flex size-10 items-center justify-center rounded-full text-primary opacity-95 transition-colors hover:bg-surface/70 focus-visible:bg-surface/70 focus-visible:outline-2 focus-visible:outline-accent`}
    >
      <Home size={20} strokeWidth={1.8} />
    </Link>
  );
}
