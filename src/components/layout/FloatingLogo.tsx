import Link from 'next/link';
import { BrandMark } from '@/components/layout/BrandMark';
import { BrandTitle } from '@/components/layout/BrandTitle';
import { DEFAULT_BRAND_CONFIG } from '@/lib/brand-constants';
import type { BrandConfig } from '@/types';

interface FloatingLogoProps {
  brand?: BrandConfig;
}

/**
 * 左上角站点标题锁字
 *
 * - position: fixed，脱离居中容器
 * - 字标主导：NavDeck 使用 KWGTDot47 点阵标题，BrandMark 作为前置锚点
 * - 标题最后一个 ASCII 字符与 Logo 终点像素同色，形成单点强调
 * - 不使用胶囊/边框/底色，避免与右上角 FloatingToolbar 控件混淆
 * - drop-shadow 仅用于壁纸上可读性，不形成可见容器
 * - 小屏（<640px）隐藏文字，仅保留 BrandMark
 */
export function FloatingLogo({
  brand = DEFAULT_BRAND_CONFIG,
}: FloatingLogoProps) {
  // Logo 与标题都隐藏时整个区域不渲染
  if (!brand.showLogo && !brand.showTitle) return null;

  return (
    <Link
      href="/"
      title={brand.title}
      aria-label={brand.title}
      className="fixed left-4 top-7 md:left-8 z-50 flex items-center gap-1.5 py-1 text-primary opacity-95 drop-shadow-sm transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-accent"
    >
      {brand.showLogo && (
        <BrandMark size="lg" logo={brand.logo} aria-label={brand.title} />
      )}
      {brand.showTitle && (
        <BrandTitle
          title={brand.title}
          className="brand-title brand-title-floating hidden select-none sm:inline"
        />
      )}
    </Link>
  );
}
