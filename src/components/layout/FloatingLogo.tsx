import Link from 'next/link';

/**
 * 左上角浮动 Logo
 * - position: fixed，脱离居中容器
 * - 贴近视口左上角（top-6 left-6）
 * - M1.3：纯文字 logo（NavDeck）
 * - M1.10：替换为正式品牌 logo
 */
export function FloatingLogo() {
  return (
    <Link
      href="/"
      className="fixed top-6 left-6 z-50 flex items-center gap-2 text-primary"
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-on-accent font-bold text-sm">
        N
      </span>
      <span className="font-semibold text-base">NavDeck</span>
    </Link>
  );
}
