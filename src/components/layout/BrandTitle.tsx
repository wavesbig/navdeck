interface BrandTitleProps {
  title: string;
  className?: string;
  accent?: boolean;
}

/**
 * 找分词边界：第二个词的首字符
 *
 * 1. 空格分词：第一个空白之后的非空白字符（"MyNAS 导航" → 导）
 * 2. 驼峰分词：小写→大写边界（"NavDeck" → D、"MyNAS" → N）
 * 3. 无边界（纯小写单词等）→ -1 不着色
 */
function findAccentIndex(chars: string[]): number {
  const spaceIndex = chars.findIndex((c) => /\s/.test(c));
  if (spaceIndex > 0) {
    const next = chars.findIndex((c, i) => i > spaceIndex && !/\s/.test(c));
    if (next > 0) return next;
  }
  for (let i = 1; i < chars.length; i++) {
    if (/[a-z]/.test(chars[i - 1]) && /[A-Z]/.test(chars[i])) return i;
  }
  return -1;
}

/**
 * 点阵品牌标题（KWGTDot47 字体）
 *
 * 第二个词的首字符用强调色，呼应 Logo 终点像素；
 * 中文等 CJK 字符自动回退系统字体
 */
export function BrandTitle({
  title,
  className = '',
  accent = true,
}: BrandTitleProps) {
  const chars = [...title.trim()];
  const accentIndex = accent ? findAccentIndex(chars) : -1;

  if (accentIndex >= 0) {
    return (
      <span className={className}>
        {chars.slice(0, accentIndex).join('')}
        <span className="brand-pixel-accent">{chars[accentIndex]}</span>
        {chars.slice(accentIndex + 1).join('')}
      </span>
    );
  }

  return <span className={className}>{title}</span>;
}
