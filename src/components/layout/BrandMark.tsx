import Image from 'next/image';

interface BrandMarkProps {
  /** 尺寸预设
   * - sm: 20px（搜索框内放大镜位置）
   * - md: 32px（默认，FloatingLogo 用）
   * - lg: 40px（登录页 / 设置预览用）
   */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义容器 className（覆盖默认样式时使用） */
  className?: string;
  /** 可访问性标签，默认 "NavDeck" */
  'aria-label'?: string;
  /** 自定义 Logo；空值使用内置标识 */
  logo?: string;
}

/** 尺寸预设对应的 Tailwind 类 */
const SIZE_CLASSES: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-8 h-8 text-base',
  lg: 'w-10 h-10 text-lg',
};

/**
 * 内置品牌图形：微圆角 N 字骨架 + 方形像素导航路径
 * 仅终点像素使用 .brand-pixel-accent，参考 KWGT 的单点强调
 */
function NavDeckGlyph() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full text-primary"
    >
      <rect x="5" y="6" width="5" height="20" rx="1.6" fill="currentColor" />
      <rect x="22" y="6" width="5" height="20" rx="1.6" fill="currentColor" />
      <rect x="10" y="8" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="14" y="12" width="4" height="4" rx="1" fill="currentColor" />
      <rect
        x="18"
        y="16"
        width="4"
        height="4"
        rx="1"
        fill="currentColor"
        className="brand-pixel-accent"
      />
    </svg>
  );
}

/**
 * NavDeck 品牌标记
 *
 * - 不带文字，仅图形标记，作为品牌视觉锚点
 * - FloatingLogo 用 md 尺寸 + 文字组合
 * - SearchBox 用 sm 尺寸替代放大镜图标，强化品牌感
 *
 * 视觉规范：
 * - 默认标识延续像素语言，并加入导航路径意象
 * - 不加底色和边框，让图形标记保持轻盈
 * - 自定义 Logo 按原比例完整展示
 */
export function BrandMark({
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'NavDeck',
  logo = '',
}: BrandMarkProps) {
  return (
    <span
      aria-label={ariaLabel}
      role="img"
      className={`inline-flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      {logo ? (
        <Image
          src={logo}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="h-full w-full object-contain"
        />
      ) : (
        <NavDeckGlyph />
      )}
    </span>
  );
}
