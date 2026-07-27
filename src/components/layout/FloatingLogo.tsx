import Link from 'next/link';
import {BrandMark} from '@/components/layout/BrandMark';

/**
 * 左上角浮动 Logo
 *
 * - position: fixed，脱离居中容器
 * - 贴近视口左上角（top-6 left-6）
 * - 用 BrandMark（N 字色块） + "NavDeck" 文字 组合
 *   与 SearchBox 内的品牌标记共享视觉，强化品牌一致性
 */
export function FloatingLogo() {
  return (
    <Link
      href="/"
      className="fixed top-6 left-6 z-50 flex items-center gap-2 text-primary"
    >
      <BrandMark size="md" />
      <span className="font-semibold text-base">NavDeck</span>
    </Link>
  );
}
