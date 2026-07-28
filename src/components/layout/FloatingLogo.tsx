import Link from 'next/link';
import { BrandMark } from '@/components/layout/BrandMark';

/**
 * 左上角浮动 Logo
 *
 * - position: fixed，脱离居中容器
 * - 贴近视口左上角（top-6 left-6）
 * - 用 BrandMark（N 字色块 md=32px）+ "NavDeck" 文字 组合
 * - 小屏（<640px）隐藏文字，仅保留 N 字色块
 *   （NetworkToggle 在小屏已隐藏，toolbar 只剩 4 个图标按钮，不会打架）
 */
export function FloatingLogo() {
  return (
    <Link
      href="/"
      className="fixed top-6 left-6 z-50 flex items-center gap-2 text-primary"
    >
      <BrandMark size="md" />
      <span className="hidden sm:inline font-semibold text-base">NavDeck</span>
    </Link>
  );
}
