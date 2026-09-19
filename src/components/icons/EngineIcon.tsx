import { Globe } from 'lucide-react';
import Image from 'next/image';
import type { SearchEngineConfig } from '@/types';

/** 引擎图标：有 logo 用图片，无 logo（自定义未配图标）回退地球图标 */
export function EngineIcon({
  engine,
  size,
}: {
  engine: SearchEngineConfig;
  size: number;
}) {
  if (!engine.logo) {
    return <Globe size={size} className="shrink-0 text-secondary" />;
  }
  return (
    <Image
      src={engine.logo}
      alt={engine.name}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 object-contain"
    />
  );
}
