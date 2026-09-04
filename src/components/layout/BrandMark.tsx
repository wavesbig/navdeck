import Image from 'next/image';

interface BrandMarkProps {
  /** 尺寸预设
   * - sm: 20px（搜索框内放大镜位置）
   * - md: 32px（默认，FloatingLogo 用）
   * - lg: 40px（登录页 / 设置预览用）
   * - xl: 80px（设置页品牌卡大预览）
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
  xl: 'w-20 h-20 text-3xl',
};

/** 内置标识的深色底板：尺寸、圆角与内衬和 favicon / OG 图标同源 */
const TILE_CLASSES: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'w-5 h-5 rounded-[6px] p-[3px]',
  md: 'w-8 h-8 rounded-[9px] p-[5px]',
  lg: 'w-10 h-10 rounded-[11px] p-[6px]',
  xl: 'w-20 h-20 rounded-[18px] p-[10px]',
};

/**
 * 内置品牌图形：像素阶梯 N，呼应 KWGTDot47 点阵标题
 * 固定使用浅色填充以适配深色底板；终点像素为品牌红
 */
function NavDeckGlyph() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full"
    >
      <rect x="6" y="6" width="4" height="20" rx="1.2" fill="#F5F7F8" />
      <rect x="22" y="6" width="4" height="20" rx="1.2" fill="#F5F7F8" />
      <rect x="10.4" y="9.2" width="3.2" height="3.2" fill="#F5F7F8" />
      <rect x="13.6" y="12.4" width="3.2" height="3.2" fill="#F5F7F8" />
      <rect x="16.8" y="15.6" width="3.2" height="3.2" fill="#F5F7F8" />
      <rect x="20" y="18.8" width="3.2" height="3.2" fill="#E5484D" />
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
 * - 深色圆角底板与 favicon / OG 图标同源，让图形更像一枚徽标
 * - 自定义 Logo 保持用户上传原图，不套底板
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
        <span
          className={`flex items-center justify-center bg-[#24272B] ${TILE_CLASSES[size]}`}
        >
          <NavDeckGlyph />
        </span>
      )}
    </span>
  );
}
