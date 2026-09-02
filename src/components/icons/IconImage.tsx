'use client';

import Image from 'next/image';
import { useState } from 'react';

interface IconImageProps {
  /** 图标值：http(s)/站内路径 视为图片，其余按文本取首字母 */
  icon: string;
  /** 首字母回退来源（通常是卡片名） */
  name?: string;
  /** 边长（px），默认 56 */
  size?: number;
  /** 图片模式容器样式 */
  imageClassName?: string;
  /** 首字母回退模式容器样式 */
  fallbackClassName?: string;
}

/** 判断是否为图片地址（外链或站内上传路径） */
function isIconUrl(icon: string): boolean {
  return /^(https?:\/|\/)/.test(icon);
}

/**
 * 图标展示（统一 URL 判定 + 加载失败回退首字母）
 *
 * 替换 CardItem.IconOrPlaceholder 与 IconPicker.IconPreview 两份重复实现。
 * 两种模式的视觉样式分别由 imageClassName / fallbackClassName 按场景传入，
 * 此处只负责「图片 or 首字母」的判定与错误回退逻辑。
 */
export function IconImage({
  icon,
  name,
  size = 56,
  imageClassName = 'rounded-widget',
  fallbackClassName = 'rounded-widget bg-accent/10 text-accent',
}: IconImageProps) {
  const [brokenIcon, setBrokenIcon] = useState<string | null>(null);
  const broken = isIconUrl(icon) && brokenIcon === icon;

  if (isIconUrl(icon) && !broken) {
    return (
      <Image
        src={icon}
        alt={name ?? '图标'}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        unoptimized
        className={`object-contain shrink-0 ${imageClassName}`}
        style={{ width: size, height: size }}
        onError={() => setBrokenIcon(icon)}
      />
    );
  }

  const letter = (name || icon || '?').charAt(0).toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center font-semibold shrink-0 ${fallbackClassName}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {letter}
    </span>
  );
}
